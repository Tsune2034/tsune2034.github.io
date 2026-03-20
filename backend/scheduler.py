"""
Kairox — Daily Briefing Scheduler
Automatically generates briefings for all target markets every morning.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from .models import BriefingRequest, Industry, Language
from .briefing import generate_briefing

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# Target audience: Japan + Taiwan + English-speaking markets
TARGET_JOBS = [
    # Japanese market — logistics focus (Narita/Chitose)
    BriefingRequest(
        industry=Industry.logistics,
        language=Language.ja,
        focus_regions=["Middle East", "Japan", "China", "USA", "Southeast Asia"],
        alert_thresholds={"oil_usd": 120, "usdjpy": 155},
    ),
    # Taiwan market — trading + tech focus
    BriefingRequest(
        industry=Industry.trading,
        language=Language.zh,
        focus_regions=["Taiwan", "China", "USA", "Middle East", "Southeast Asia"],
        alert_thresholds={"oil_usd": 110},
    ),
    BriefingRequest(
        industry=Industry.tech,
        language=Language.zh,
        focus_regions=["Taiwan", "China", "USA", "South Korea", "Japan"],
    ),
    # English market — general intelligence
    BriefingRequest(
        industry=Industry.general,
        language=Language.en,
        focus_regions=["Middle East", "East Asia", "Europe", "USA"],
        alert_thresholds={"oil_usd": 120},
    ),
    BriefingRequest(
        industry=Industry.finance,
        language=Language.en,
        focus_regions=["USA", "Europe", "China", "Middle East"],
    ),
]


def run_daily_briefings(db=None):
    """Generate briefings for all target markets. Pass a DB session to persist results."""
    log.info(f"Starting daily briefing run — {datetime.now(timezone.utc).isoformat()}")
    for req in TARGET_JOBS:
        label = f"{req.industry.value}/{req.language.value}"
        try:
            log.info(f"Generating: {label}")
            result = generate_briefing(req)
            if db is not None:
                from .database import save_briefing
                save_briefing(db, result)
            log.info(f"Done: {label} — risk={result.overall_risk_score} ({result.risk_level})")
            if result.alerts_triggered:
                for alert in result.alerts_triggered:
                    log.warning(alert)
        except Exception as e:
            log.error(f"Failed: {label} — {e}")
    log.info("Daily briefing run complete.")
