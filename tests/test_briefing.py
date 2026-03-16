"""
Kairox — Test Suite
Tests for models, JSON parsing, alert logic, and API endpoints.
API calls to Claude are mocked to avoid real costs.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from backend.models import (
    BriefingRequest, BriefingResponse, Industry, Language,
    RiskFactor, KeyEvent,
)
from backend.briefing import _extract_json, _check_alerts, _build_prompt
from backend.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_BRIEFING_DICT = {
    "overall_risk_score": 72,
    "risk_level": "high",
    "executive_summary": "Global tensions rising. Supply chain disruptions imminent.",
    "key_events": [
        {
            "title": "Strait of Hormuz tension",
            "region": "Middle East",
            "severity": "high",
            "summary": "Iran naval exercises near key oil shipping lane.",
            "industry_impact": "Oil price spike risk for logistics sector.",
            "source_hint": "Reuters / AP",
        }
    ],
    "risk_factors": [
        {
            "name": "Oil Price",
            "score": 75,
            "trend": "rising",
            "description": "Brent crude above $100.",
            "business_impact": "Fuel surcharges expected to increase 15%.",
        },
        {
            "name": "JPY Currency",
            "score": 66,
            "trend": "rising",
            "description": "USD/JPY approaching 155.",
            "business_impact": "Import costs for manufacturers rising.",
        },
    ],
    "recommended_actions": [
        "Hedge fuel costs via forward contracts.",
        "Diversify shipping routes away from Hormuz.",
        "Monitor USD/JPY daily; review import pricing.",
    ],
}

SAMPLE_JSON_STR = json.dumps(SAMPLE_BRIEFING_DICT)


@pytest.fixture
def sample_request():
    return BriefingRequest(
        industry=Industry.logistics,
        language=Language.en,
        focus_regions=["Middle East", "Japan"],
        alert_thresholds={"oil_usd": 120, "usdjpy": 155},
    )


@pytest.fixture
def sample_response():
    d = SAMPLE_BRIEFING_DICT
    return BriefingResponse(
        date="2026-03-15",
        industry="logistics",
        language="en",
        overall_risk_score=d["overall_risk_score"],
        risk_level=d["risk_level"],
        executive_summary=d["executive_summary"],
        key_events=[KeyEvent(**e) for e in d["key_events"]],
        risk_factors=[RiskFactor(**r) for r in d["risk_factors"]],
        recommended_actions=d["recommended_actions"],
        alerts_triggered=[],
        generated_at="2026-03-15T06:00:00+00:00",
    )


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TestModels:
    def test_industry_values(self):
        assert Industry.logistics.value == "logistics"
        assert Industry.tech.value == "tech"

    def test_language_values(self):
        assert Language.en.value == "en"
        assert Language.ja.value == "ja"
        assert Language.zh.value == "zh"

    def test_briefing_request_defaults(self):
        req = BriefingRequest()
        assert req.industry == Industry.general
        assert req.language == Language.en
        assert req.focus_regions is None
        assert req.alert_thresholds is None

    def test_briefing_response_fields(self, sample_response):
        assert sample_response.overall_risk_score == 72
        assert sample_response.risk_level == "high"
        assert len(sample_response.key_events) == 1
        assert len(sample_response.risk_factors) == 2
        assert len(sample_response.recommended_actions) == 3

    def test_risk_factor_model(self):
        rf = RiskFactor(
            name="Oil Price",
            score=80,
            trend="rising",
            description="High",
            business_impact="Cost increase",
        )
        assert rf.score == 80
        assert rf.trend == "rising"

    def test_key_event_model(self):
        ev = KeyEvent(
            title="Test",
            region="Asia",
            severity="medium",
            summary="A test event.",
            industry_impact="Minimal.",
            source_hint="BBC",
        )
        assert ev.severity == "medium"


# ---------------------------------------------------------------------------
# JSON extraction tests
# ---------------------------------------------------------------------------

class TestExtractJson:
    def test_plain_json(self):
        text = SAMPLE_JSON_STR
        result = _extract_json(text)
        assert json.loads(result)["overall_risk_score"] == 72

    def test_json_with_preamble(self):
        text = "Here is the briefing:\n\n" + SAMPLE_JSON_STR + "\n\nDone."
        result = _extract_json(text)
        assert json.loads(result)["risk_level"] == "high"

    def test_json_in_code_block(self):
        text = "```json\n" + SAMPLE_JSON_STR + "\n```"
        result = _extract_json(text)
        assert json.loads(result)["overall_risk_score"] == 72

    def test_no_json_falls_back_to_briefing_wrapper(self):
        # Plain text with no JSON should return {"briefing": <text>} instead of raising.
        result = json.loads(_extract_json("No JSON here at all."))
        assert "briefing" in result
        assert result["briefing"] == "No JSON here at all."

    def test_malformed_json_falls_back_to_briefing_wrapper(self):
        # Malformed JSON (unclosed brace) cannot be decoded, so falls back gracefully.
        result = json.loads(_extract_json("{unclosed"))
        assert "briefing" in result

    def test_empty_text_raises(self):
        # Empty string is the only case that should still raise.
        with pytest.raises(ValueError, match="Empty response"):
            _extract_json("")

    def test_braces_inside_strings_parsed_correctly(self):
        # Old brace-counter broke on {"key": "value {with} braces"}.
        text = '{"key": "value {with} braces", "num": 42}'
        result = json.loads(_extract_json(text))
        assert result["num"] == 42
        assert "{with}" in result["key"]


# ---------------------------------------------------------------------------
# Alert logic tests
# ---------------------------------------------------------------------------

class TestCheckAlerts:
    def test_no_thresholds_returns_empty(self):
        alerts = _check_alerts(SAMPLE_BRIEFING_DICT, {})
        assert alerts == []

    def test_oil_alert_triggered(self):
        alerts = _check_alerts(SAMPLE_BRIEFING_DICT, {"oil_usd": 120})
        assert any("Oil" in a for a in alerts)

    def test_currency_alert_triggered(self):
        alerts = _check_alerts(SAMPLE_BRIEFING_DICT, {"usdjpy": 155})
        assert any("Currency" in a or "JPY" in a for a in alerts)

    def test_overall_risk_alert(self):
        data = {**SAMPLE_BRIEFING_DICT, "overall_risk_score": 80}
        alerts = _check_alerts(data, {})
        assert any("Overall" in a for a in alerts)

    def test_low_score_no_alert(self):
        data = {
            **SAMPLE_BRIEFING_DICT,
            "overall_risk_score": 40,
            "risk_factors": [
                {"name": "Oil Price", "score": 30, "trend": "stable",
                 "description": "Low", "business_impact": "Minimal"},
            ],
        }
        alerts = _check_alerts(data, {"oil_usd": 120, "usdjpy": 155})
        assert alerts == []


# ---------------------------------------------------------------------------
# Prompt builder tests
# ---------------------------------------------------------------------------

class TestBuildPrompt:
    def test_english_prompt(self, sample_request):
        prompt = _build_prompt(sample_request)
        assert "English" in prompt
        assert "logistics" in prompt
        assert "Middle East" in prompt

    def test_japanese_prompt(self):
        req = BriefingRequest(industry=Industry.tech, language=Language.ja)
        prompt = _build_prompt(req)
        assert "Japanese" in prompt
        assert "tech" in prompt

    def test_traditional_chinese_prompt(self):
        req = BriefingRequest(industry=Industry.trading, language=Language.zh)
        prompt = _build_prompt(req)
        assert "Traditional Chinese" in prompt
        assert "Taiwan" in prompt

    def test_global_regions_default(self):
        req = BriefingRequest()
        prompt = _build_prompt(req)
        assert "global" in prompt

    def test_focus_regions_included(self, sample_request):
        prompt = _build_prompt(sample_request)
        assert "Japan" in prompt


# ---------------------------------------------------------------------------
# API endpoint tests (mocked Claude calls)
# ---------------------------------------------------------------------------

class TestAPI:
    def test_health(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_list_industries(self):
        resp = client.get("/industries")
        assert resp.status_code == 200
        values = [i["value"] for i in resp.json()]
        assert "logistics" in values
        assert "tech" in values

    def test_list_languages(self):
        resp = client.get("/languages")
        assert resp.status_code == 200
        values = [l["value"] for l in resp.json()]
        assert set(values) == {"en", "ja", "zh"}

    def test_latest_briefing_not_found(self):
        resp = client.get("/briefing/latest?industry=manufacturing&language=zh")
        assert resp.status_code == 404

    @patch("backend.main.generate_briefing")
    def test_create_briefing(self, mock_gen, sample_response):
        mock_gen.return_value = sample_response
        payload = {
            "industry": "logistics",
            "language": "en",
            "focus_regions": ["Japan", "Middle East"],
        }
        resp = client.post("/briefing", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_risk_score"] == 72
        assert data["risk_level"] == "high"
        assert len(data["key_events"]) == 1

    @patch("backend.main.generate_briefing")
    def test_latest_briefing_after_create(self, mock_gen, sample_response):
        mock_gen.return_value = sample_response
        client.post("/briefing", json={"industry": "logistics", "language": "en"})
        resp = client.get("/briefing/latest?industry=logistics&language=en")
        assert resp.status_code == 200
        assert resp.json()["risk_level"] == "high"

    @patch("backend.main.generate_briefing")
    def test_create_briefing_server_error(self, mock_gen):
        mock_gen.side_effect = RuntimeError("Claude API timeout")
        resp = client.post("/briefing", json={"industry": "general", "language": "en"})
        assert resp.status_code == 500
        assert "Claude API timeout" in resp.json()["detail"]
