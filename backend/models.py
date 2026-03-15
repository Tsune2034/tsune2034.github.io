from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class Industry(str, Enum):
    manufacturing = "manufacturing"
    trading = "trading"
    logistics = "logistics"
    finance = "finance"
    tech = "tech"
    general = "general"


class Language(str, Enum):
    en = "en"
    ja = "ja"
    zh = "zh"  # Traditional Chinese (Taiwan)


class RiskFactor(BaseModel):
    name: str
    score: int          # 0-100
    trend: str          # "rising" | "stable" | "falling"
    description: str
    business_impact: str


class KeyEvent(BaseModel):
    title: str
    region: str
    severity: str       # "critical" | "high" | "medium" | "low"
    summary: str
    industry_impact: str
    source_hint: str


class BriefingRequest(BaseModel):
    industry: Industry = Industry.general
    language: Language = Language.en
    focus_regions: Optional[List[str]] = None   # e.g. ["Middle East", "Japan", "China"]
    alert_thresholds: Optional[dict] = None     # e.g. {"oil_usd": 120, "usdjpy": 155}


class BriefingResponse(BaseModel):
    date: str
    industry: str
    language: str
    overall_risk_score: int         # 0-100
    risk_level: str                 # "critical" | "high" | "medium" | "low"
    executive_summary: str          # 3-min read
    key_events: List[KeyEvent]
    risk_factors: List[RiskFactor]
    recommended_actions: List[str]
    alerts_triggered: List[str]
    generated_at: str
