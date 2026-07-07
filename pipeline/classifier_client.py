import logging
import sys
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ClassifierClient:
    def classify(self, log_text: str, projects: list[dict]) -> dict:
        """
        log_text: 1日分のマージ済みログを整形したテキスト
        projects: [{name, keywords, status}, ...]
        戻り値: 3.5節のJSONスキーマに準拠したdict
        """
        raise NotImplementedError

class LocalAntigravityClassifier(ClassifierClient):
    def __init__(self, endpoint: str):
        self.endpoint = endpoint

        if self.endpoint == "PLACEHOLDER":
            logger.error("classifier_endpointが未設定です。config.jsonを確認してください")
            sys.exit(1)

    def classify(self, log_text: str, projects: list[dict]) -> dict:
        # TODO: Implement actual Antigravity API call when spec is finalized
        logger.info(f"Calling Antigravity at {self.endpoint}...")
        raise NotImplementedError("Actual API call not yet implemented.")

class MockClassifier(ClassifierClient):
    def classify(self, log_text: str, projects: list[dict]) -> dict:
        logger.info("Using MockClassifier: returning all time as unclassified.")
        # Calculate total minutes from log_text length as a dummy metric
        # In a real scenario, this would parse the timestamps.
        # Here we just return a static dummy response for testing.

        return {
            "date": "1970-01-01", # Will be overridden by daily_report.py
            "projects": [],
            "unclassified_minutes": 120, # Dummy value
            "focus": {
                "context_switches": 0,
                "longest_focus_minutes": 120
            }
        }
