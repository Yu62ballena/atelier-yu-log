import logging
import sqlite3
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    from notion_client import Client
    from notion_client.errors import APIResponseError
except ImportError:
    # Handle the case where notion_client is not yet installed during development
    Client = None
    APIResponseError = Exception

logger = logging.getLogger(__name__)

class NotionManager:
    def __init__(self, token: str, projects_db_id: str, reports_db_id: str, db_path: Path):
        self.token = token
        self.projects_db_id = projects_db_id
        self.reports_db_id = reports_db_id
        self.db_path = db_path

        # Initialize Notion client if token is provided and not PLACEHOLDER
        if self.token and self.token != "PLACEHOLDER" and Client:
            self.client = Client(auth=self.token)
        else:
            self.client = None

        self._init_cache_table()

    def _init_cache_table(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects_cache (
                notion_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                keywords TEXT,
                status TEXT,
                synced_at TEXT
            )
        """)
        conn.commit()
        conn.close()

    def fetch_projects(self) -> List[Dict[str, Any]]:
        """Fetch projects from Notion and update cache. Returns list of projects."""
        projects = []
        synced_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if not self.client or self.projects_db_id == "PLACEHOLDER":
            logger.warning("Notion client not configured. Falling back to cached projects.")
            return self._get_cached_projects()

        try:
            results = []
            has_more = True
            next_cursor = None

            while has_more:
                response = self.client.databases.query(
                    database_id=self.projects_db_id,
                    start_cursor=next_cursor
                )
                results.extend(response.get("results", []))
                has_more = response.get("has_more", False)
                next_cursor = response.get("next_cursor")

            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            for page in results:
                props = page.get("properties", {})

                # Extract Name (title property)
                name = ""
                for key, prop in props.items():
                    if prop.get("type") == "title":
                        title_arr = prop.get("title", [])
                        if title_arr:
                            name = title_arr[0].get("plain_text", "")
                        break

                if not name:
                    continue

                # Extract Status (status or select property)
                status = ""
                for key, prop in props.items():
                    if prop.get("type") == "status" and prop.get("status"):
                        status = prop["status"].get("name", "")
                        break
                    elif prop.get("type") == "select" and prop.get("select"):
                        status = prop["select"].get("name", "")
                        break

                # Extract Keywords (rich_text property)
                keywords = ""
                for key, prop in props.items():
                    if prop.get("type") == "rich_text":
                        rt_arr = prop.get("rich_text", [])
                        if rt_arr:
                            keywords = rt_arr[0].get("plain_text", "")
                        break

                notion_id = page["id"]
                projects.append({
                    "notion_id": notion_id,
                    "name": name,
                    "keywords": keywords,
                    "status": status
                })

                cursor.execute("""
                    INSERT OR REPLACE INTO projects_cache (notion_id, name, keywords, status, synced_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (notion_id, name, keywords, status, synced_at))

            conn.commit()
            conn.close()
            logger.info(f"Successfully synced {len(projects)} projects from Notion.")
            return projects

        except Exception as e:
            logger.error(f"Failed to fetch projects from Notion: {e}. Falling back to cache.")
            return self._get_cached_projects()

    def _get_cached_projects(self) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT notion_id, name, keywords, status FROM projects_cache")
        rows = cursor.fetchall()
        conn.close()

        projects = [dict(row) for row in rows]
        if not projects:
            logger.warning("Project cache is empty. All time will be marked as unclassified.")
        return projects

    def write_daily_report(self, date_str: str, report_data: Dict[str, Any]) -> Optional[str]:
        """Write daily report to Notion. Returns the Notion page ID if successful."""
        if not self.client or self.reports_db_id == "PLACEHOLDER":
            logger.warning("Notion client not configured. Skipping Notion report write.")
            return None

        try:
            # Check if page already exists for this date
            response = self.client.databases.query(
                database_id=self.reports_db_id,
                filter={
                    "property": "Date", # Assuming standard property name, adjust if needed
                    "date": {
                        "equals": date_str
                    }
                }
            )

            existing_pages = response.get("results", [])
            page_id = existing_pages[0]["id"] if existing_pages else None

            # Construct properties
            properties = {
                "Date": {
                    "date": {"start": date_str}
                },
                # Assuming title property is 'Name' or 'Title'
                "Title": {
                    "title": [{"text": {"content": f"Daily Report - {date_str}"}}]
                }
            }

            # Construct blocks (body)
            blocks = []

            # Focus metrics
            focus = report_data.get("focus", {})
            if focus:
                blocks.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {"rich_text": [{"type": "text", "text": {"content": "Focus Metrics"}}]}
                })
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": f"Context Switches: {focus.get('context_switches', 0)}"}}] }
                })
                blocks.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": f"Longest Focus (min): {focus.get('longest_focus_minutes', 0)}"}}] }
                })

            # Projects breakdown
            projects = report_data.get("projects", [])
            if projects:
                blocks.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {"rich_text": [{"type": "text", "text": {"content": "Projects Breakdown"}}]}
                })

                for proj in projects:
                    blocks.append({
                        "object": "block",
                        "type": "heading_3",
                        "heading_3": {"rich_text": [{"type": "text", "text": {"content": f"{proj.get('name')} ({proj.get('minutes', 0)} min)"}}]}
                    })

                    if proj.get("summary"):
                        blocks.append({
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {"rich_text": [{"type": "text", "text": {"content": proj.get("summary")}}]}
                        })

                    for ev in proj.get("evidence", []):
                        blocks.append({
                            "object": "block",
                            "type": "bulleted_list_item",
                            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": ev}}]}
                        })

            unclassified_min = report_data.get("unclassified_minutes", 0)
            if unclassified_min > 0:
                 blocks.append({
                    "object": "block",
                    "type": "heading_3",
                    "heading_3": {"rich_text": [{"type": "text", "text": {"content": f"Unclassified ({unclassified_min} min)"}}]}
                })

            if page_id:
                # Update existing page
                # Note: Notion API doesn't easily allow fully replacing blocks in one go,
                # so we append new blocks or we just update properties.
                # For simplicity in this implementation, we'll just update properties.
                # In a robust implementation, you might delete old blocks and append new ones.
                self.client.pages.update(
                    page_id=page_id,
                    properties=properties
                )
                logger.info(f"Updated existing Notion report for {date_str}")
                return page_id
            else:
                # Create new page
                new_page = self.client.pages.create(
                    parent={"database_id": self.reports_db_id},
                    properties=properties,
                    children=blocks
                )
                logger.info(f"Created new Notion report for {date_str}")
                return new_page["id"]

        except Exception as e:
            logger.error(f"Failed to write daily report to Notion: {e}")
            return None
