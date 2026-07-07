import json
import logging
import os
import sqlite3
import sys
import time
import asyncio
from pathlib import Path

# --- Configuration & Setup ---

BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "config.json"
EXAMPLE_CONFIG_PATH = BASE_DIR / "config.example.json"
PID_FILE = BASE_DIR / ".collector.pid"

def setup_logger():
    logger = logging.getLogger("collector")
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

logger = setup_logger()

def load_config():
    if not CONFIG_PATH.exists():
        logger.warning(f"{CONFIG_PATH} not found. Falling back to {EXAMPLE_CONFIG_PATH}.")
        path_to_load = EXAMPLE_CONFIG_PATH
    else:
        path_to_load = CONFIG_PATH

    try:
        with open(path_to_load, "r", encoding="utf-8") as f:
            config = json.load(f)
        return config
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        # fallback defaults just in case
        return {
            "poll_interval_sec": 60,
            "afk_threshold_sec": 300,
            "db_path": "../data/atelier.db",
            "exclude_apps": []
        }

def init_db(db_path: str):
    # Resolve db path relative to BASE_DIR
    db_file = (BASE_DIR / db_path).resolve()
    db_file.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
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
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_started ON events(started_at)")
    conn.commit()
    conn.close()
    return db_file

def check_and_create_pid():
    if PID_FILE.exists():
        try:
            with open(PID_FILE, "r") as f:
                old_pid = int(f.read().strip())
            # Check if process is running
            os.kill(old_pid, 0)
            logger.warning(f"Another collector process (PID {old_pid}) is already running. Exiting.")
            sys.exit(1)
        except (ValueError, OSError):
            # Process is not running or invalid PID file
            pass

    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

def remove_pid():
    if PID_FILE.exists():
        try:
            PID_FILE.unlink()
        except OSError:
            pass

# --- Data Collection (macOS API / Linux Mock) ---

MOCK_STATE_FILE = Path("/tmp/mock_mac_state.json")

def get_idle_time_sec() -> float:
    if sys.platform == 'darwin':
        try:
            import Quartz
            return Quartz.CGEventSourceSecondsSinceLastEventType(Quartz.kCGEventSourceStateHIDSystemState, Quartz.kCGAnyInputEventType)
        except Exception as e:
            logger.error(f"Failed to get idle time: {e}")
            return 0.0
    else:
        # Mock for Linux sandbox
        if MOCK_STATE_FILE.exists():
            try:
                with open(MOCK_STATE_FILE, "r") as f:
                    return float(json.load(f).get("idle_time_sec", 0.0))
            except Exception:
                return 0.0
        return 0.0

def get_active_app() -> str:
    if sys.platform == 'darwin':
        try:
            from AppKit import NSWorkspace
            app = NSWorkspace.sharedWorkspace().frontmostApplication()
            return app.localizedName() if app else ""
        except Exception as e:
            logger.error(f"Failed to get active app: {e}")
            return ""
    else:
        # Mock for Linux sandbox
        if MOCK_STATE_FILE.exists():
            try:
                with open(MOCK_STATE_FILE, "r") as f:
                    return json.load(f).get("active_app", "MockApp")
            except Exception:
                return "MockApp"
        return "MockApp"

def get_window_title(app_name: str) -> str:
    if sys.platform == 'darwin':
        try:
            import Quartz
            window_list = Quartz.CGWindowListCopyWindowInfo(
                Quartz.kCGWindowListOptionOnScreenOnly | Quartz.kCGWindowListExcludeDesktopElements,
                Quartz.kCGNullWindowID
            )
            for window in window_list:
                owner = window.get(Quartz.kCGWindowOwnerName, "")
                if owner == app_name:
                    return window.get(Quartz.kCGWindowName, "")
            return ""
        except Exception as e:
            logger.error(f"Failed to get window title: {e}")
            return ""
    else:
        # Mock for Linux sandbox
        if MOCK_STATE_FILE.exists():
            try:
                with open(MOCK_STATE_FILE, "r") as f:
                    return json.load(f).get("window_title", "Mock Title")
            except Exception:
                return "Mock Title"
        return "Mock Title"

def get_chrome_url() -> str:
    if sys.platform == 'darwin':
        script = 'tell application "Google Chrome" to get URL of active tab of front window'
        import subprocess
        try:
            result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                return result.stdout.strip()
            return ""
        except subprocess.TimeoutExpired:
            return ""
        except Exception as e:
            logger.error(f"Failed to get chrome url: {e}")
            return ""
    else:
        # Mock for Linux sandbox
        if MOCK_STATE_FILE.exists():
            try:
                with open(MOCK_STATE_FILE, "r") as f:
                    return json.load(f).get("chrome_url", "https://mock.com")
            except Exception:
                return "https://mock.com"
        return "https://mock.com"


import datetime

def record_event(db_file: Path, app: str, title: str, url: str, is_afk: int, actual_elapsed_sec: int, start_timestamp: float = None):
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Get last event
    cursor.execute("SELECT id, app, title, url, is_afk, duration_sec FROM events ORDER BY id DESC LIMIT 1")
    last_event = cursor.fetchone()

    if last_event:
        last_id, last_app, last_title, last_url, last_is_afk, last_duration = last_event
        # Exact match check
        if last_app == app and last_title == title and last_url == url and last_is_afk == is_afk:
            new_duration = last_duration + actual_elapsed_sec
            cursor.execute("UPDATE events SET duration_sec = ? WHERE id = ?", (new_duration, last_id))
            conn.commit()
            conn.close()
            return

    # Insert new event
    if start_timestamp is None:
        start_timestamp = time.time() - actual_elapsed_sec
    dt = datetime.datetime.fromtimestamp(start_timestamp, tz=datetime.timezone.utc).astimezone()
    started_at = dt.isoformat()

    cursor.execute(
        "INSERT INTO events (started_at, duration_sec, app, title, url, is_afk) VALUES (?, ?, ?, ?, ?, ?)",
        (started_at, actual_elapsed_sec, app, title, url, is_afk)
    )
    conn.commit()
    conn.close()

async def main_loop():
    config = load_config()
    db_file = init_db(config["db_path"])
    poll_interval = config.get("poll_interval_sec", 60)
    afk_threshold = config.get("afk_threshold_sec", 300)
    exclude_apps = config.get("exclude_apps", [])

    logger.info(f"Collector started. DB: {db_file}, Poll: {poll_interval}s")

    last_poll_time = time.time()

    while True:
        await asyncio.sleep(poll_interval)
        current_time = time.time()
        elapsed_sec = int(current_time - last_poll_time)
        last_poll_time = current_time

        # Sleep gap recovery
        if elapsed_sec > poll_interval * 3:
            logger.info(f"Sleep gap detected: {elapsed_sec}s. Recording as Sleep/Offline.")
            record_event(db_file, "System", "Sleep/Offline", "", 1, elapsed_sec, start_timestamp=current_time - elapsed_sec)
            continue

        idle_sec = get_idle_time_sec()
        is_afk = 1 if idle_sec > afk_threshold else 0

        app = get_active_app()
        if app in exclude_apps:
            continue

        title = get_window_title(app) if not is_afk else ""
        url = get_chrome_url() if (app == "Google Chrome" and not is_afk) else ""

        record_event(db_file, app, title, url, is_afk, elapsed_sec, start_timestamp=current_time - elapsed_sec)

if __name__ == '__main__':
    check_and_create_pid()
    try:
        asyncio.run(main_loop())
    except KeyboardInterrupt:
        logger.info("Collector stopped by user.")
    except Exception as e:
        logger.error(f"Collector crashed: {e}")
    finally:
        remove_pid()
