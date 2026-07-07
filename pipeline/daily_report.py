import argparse
import datetime
import json
import logging
import sqlite3
import sys
from pathlib import Path
from typing import Dict, Any

from pipeline.notion_client import NotionManager
from pipeline.classifier_client import LocalAntigravityClassifier, MockClassifier

BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "config.json"
EXAMPLE_CONFIG_PATH = BASE_DIR / "config.example.json"

def setup_logger():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

logger = setup_logger()

def load_config() -> dict:
    path_to_load = CONFIG_PATH if CONFIG_PATH.exists() else EXAMPLE_CONFIG_PATH
    if not CONFIG_PATH.exists():
        logger.warning(f"{CONFIG_PATH} not found. Using {EXAMPLE_CONFIG_PATH}.")

    with open(path_to_load, "r", encoding="utf-8") as f:
        return json.load(f)

def init_reports_db(db_path: Path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_reports (
          date TEXT PRIMARY KEY,
          result_json TEXT NOT NULL,
          notion_page_id TEXT,
          created_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_events_for_date(db_path: Path, target_date: str) -> list:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Use string matching to avoid SQLite UTC conversion shift on ISO formatted local dates
    cursor.execute("""
        SELECT started_at, duration_sec, app, title, url
        FROM events
        WHERE substr(started_at, 1, 10) = ? AND is_afk = 0
        ORDER BY started_at ASC
    """, (target_date,))

    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def format_log_text(events: list) -> str:
    lines = []
    for ev in events:
        start_dt = datetime.datetime.fromisoformat(ev["started_at"])
        end_dt = start_dt + datetime.timedelta(seconds=ev["duration_sec"])

        start_str = start_dt.strftime("%H:%M:%S")
        end_str = end_dt.strftime("%H:%M:%S")

        app = ev.get("app", "")
        title = ev.get("title", "")
        url = ev.get("url", "")

        details = " / ".join(filter(None, [app, title, url]))
        lines.append(f"{start_str} - {end_str} ({details})")

    return "\n".join(lines)

def validate_ai_output(output: dict) -> bool:
    try:
        if not isinstance(output.get("projects"), list):
            return False
        for proj in output["projects"]:
            if not isinstance(proj.get("minutes"), (int, float)):
                return False
        if not isinstance(output.get("unclassified_minutes"), (int, float)):
            return False
        if not isinstance(output.get("focus"), dict):
            return False
        return True
    except Exception:
        return False

def save_report_to_db(db_path: Path, date_str: str, report_data: dict, notion_page_id: str = None):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    created_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    cursor.execute("""
        INSERT OR REPLACE INTO daily_reports (date, result_json, notion_page_id, created_at)
        VALUES (?, ?, ?, ?)
    """, (date_str, json.dumps(report_data, ensure_ascii=False), notion_page_id, created_at))

    conn.commit()
    conn.close()
    logger.info(f"Saved report for {date_str} to local SQLite database.")

def main():
    parser = argparse.ArgumentParser(description="Atelier Yu Log - Daily Report Pipeline")
    parser.add_argument("--date", type=str, help="Target date in YYYY-MM-DD format (defaults to today)")
    parser.add_argument("--mock", action="store_true", help="Use mock AI classifier")
    args = parser.parse_args()

    target_date = args.date or datetime.date.today().isoformat()
    logger.info(f"Starting pipeline for date: {target_date}")

    config = load_config()
    db_path = (BASE_DIR / config["db_path"]).resolve()

    init_reports_db(db_path)

    events = get_events_for_date(db_path, target_date)
    if not events:
        logger.info(f"No events found for {target_date}. Creating empty report.")
        empty_report = {
            "date": target_date,
            "projects": [],
            "unclassified_minutes": 0,
            "focus": {"context_switches": 0, "longest_focus_minutes": 0}
        }
        save_report_to_db(db_path, target_date, empty_report)
        sys.exit(0)

    log_text = format_log_text(events)

    notion = NotionManager(
        token=config.get("notion_token"),
        projects_db_id=config.get("notion_projects_db_id"),
        reports_db_id=config.get("notion_reports_db_id"),
        db_path=db_path
    )

    projects = notion.fetch_projects()

    if args.mock:
        classifier = MockClassifier()
    else:
        classifier = LocalAntigravityClassifier(endpoint=config.get("classifier_endpoint", "PLACEHOLDER"))

    max_retries = 1
    report_data = None

    for attempt in range(max_retries + 1):
        try:
            report_data = classifier.classify(log_text, projects)

            # If mock, override date
            if args.mock:
                report_data["date"] = target_date

            if validate_ai_output(report_data):
                break
            else:
                logger.warning(f"AI output validation failed (Attempt {attempt + 1}).")
                report_data = None
        except Exception as e:
            logger.warning(f"Classifier failed: {e} (Attempt {attempt + 1}).")
            report_data = None

        if attempt < max_retries:
            logger.info("Retrying AI classification...")

    if not report_data:
        logger.error("Failed to generate a valid report after retries. Aborting.")
        sys.exit(1)

    notion_page_id = notion.write_daily_report(target_date, report_data)

    save_report_to_db(db_path, target_date, report_data, notion_page_id)
    logger.info("Pipeline completed successfully.")

if __name__ == "__main__":
    main()
