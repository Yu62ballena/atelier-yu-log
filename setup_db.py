import sqlite3
import json
import datetime
import os

os.makedirs('data', exist_ok=True)
db_path = 'data/atelier.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create tables based on schema
cursor.execute("""
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    started_at TEXT NOT NULL,
    duration_sec INTEGER NOT NULL,
    app TEXT NOT NULL,
    title TEXT,
    url TEXT,
    is_afk INTEGER DEFAULT 0
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS daily_reports (
    date TEXT PRIMARY KEY,
    result_json TEXT NOT NULL,
    notion_page_id TEXT,
    created_at TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS projects_cache (
    notion_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    keywords TEXT,
    status TEXT,
    synced_at TEXT
)
""")

# Insert some test data
today = datetime.datetime.now().strftime('%Y-%m-%d')
today_date = datetime.datetime.now().date()
today_dt = datetime.datetime(today_date.year, today_date.month, today_date.day)

cursor.execute("INSERT OR REPLACE INTO projects_cache VALUES (?, ?, ?, ?, ?)",
               ("notion_id_1", "Dashboard Dev", "react, nextjs", "In Progress", datetime.datetime.now().isoformat()))
cursor.execute("INSERT OR REPLACE INTO projects_cache VALUES (?, ?, ?, ?, ?)",
               ("notion_id_2", "Collector Fixes", "python", "Done", datetime.datetime.now().isoformat()))

cursor.execute("INSERT OR REPLACE INTO daily_reports VALUES (?, ?, ?, ?)",
               (today, json.dumps({
                   "projects": [
                       {"name": "Dashboard Dev", "minutes": 120, "summary": "Worked on Next.js UI"},
                       {"name": "Collector Fixes", "minutes": 45, "summary": "Fixed bugs"}
                   ],
                   "unclassified_minutes": 15
               }), "12345678-1234-1234-1234-1234567890ab", datetime.datetime.now().isoformat()))

events = [
    (today_dt + datetime.timedelta(hours=9)).isoformat(), 3600, "Cursor", "dashboard/app/page.tsx", "", 0,
    (today_dt + datetime.timedelta(hours=10)).isoformat(), 3600, "Google Chrome", "React Docs", "reactjs.org", 0,
    (today_dt + datetime.timedelta(hours=11)).isoformat(), 900, "AFK", "", "", 1,
    (today_dt + datetime.timedelta(hours=11, minutes=15)).isoformat(), 2700, "Terminal", "python main.py", "", 0
]
cursor.execute("INSERT OR REPLACE INTO events (started_at, duration_sec, app, title, url, is_afk) VALUES (?, ?, ?, ?, ?, ?)", events[:6])
cursor.execute("INSERT OR REPLACE INTO events (started_at, duration_sec, app, title, url, is_afk) VALUES (?, ?, ?, ?, ?, ?)", events[6:12])
cursor.execute("INSERT OR REPLACE INTO events (started_at, duration_sec, app, title, url, is_afk) VALUES (?, ?, ?, ?, ?, ?)", events[12:18])
cursor.execute("INSERT OR REPLACE INTO events (started_at, duration_sec, app, title, url, is_afk) VALUES (?, ?, ?, ?, ?, ?)", events[18:24])

conn.commit()
conn.close()
