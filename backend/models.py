from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


# ───────────────────────── Booking ─────────────────────────

class BookingCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    locale: str = "en"                # en | ja | zh | ko
    plan: str                         # solo | pair | family
    extra_bags: int = 0
    pickup_location: str = ""
    pickup_date: str = ""
    destination: str                  # hotel | narita | haneda
    zone: str = "chitose"             # chitose | sapporo | otaru
    hotel_name: str = ""
    room_number: str = ""
    pay_method: str                   # credit | usdc
    total_amount: int
    share_ride: bool = True
    preferred_slot: Optional[int] = None   # 1〜4
    flight_number: str = ""


class MatchResult(BaseModel):
    match_count: int = 0
    group_id: Optional[str] = None
    route_order: Optional[List[int]] = None
    estimated_minutes: Optional[int] = None
    route_reason: Optional[str] = None


class DriverRegistrationCreate(BaseModel):
    name: str
    phone: str
    vehicle: str = ""
    area: str = ""
    style: str = ""


# ───────────────────────── Player ─────────────────────────

class PlayerCreate(BaseModel):
    name: str
    email: str
    phone: str
    route: str = "both"   # narita | haneda | both


class PlayerReviewCreate(BaseModel):
    player_id: int
    booking_id: str
    rating: int           # 1〜5
    on_time: bool = True
    comment: str = ""


class PlayerResponse(BaseModel):
    id: int
    name: str
    email: str
    route: str
    id_verified: bool
    completed_jobs: int
    avg_rating: float
    trust_score: float
    rank: str
    breakdown: Optional[dict] = None
    created_at: str


class DriverLocationUpdate(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    driver_status: str = "heading"
    route_type: str = "local"   # "highway" | "local"


class PlayerLocationUpdate(BaseModel):
    lat: float
    lng: float
    is_available: bool = True


class DispatchResult(BaseModel):
    ok: bool
    player_id: Optional[int] = None
    reason: str = ""
    confidence: float = 0.0


class MonitorAlert(BaseModel):
    booking_id: Optional[str] = None
    type: str
    msg: str
    stale_min: Optional[float] = None
    player_status: Optional[str] = None


class BookingResponse(BaseModel):
    booking_id: str
    status: str
    match: MatchResult
    created_at: str
    ai_message: Optional[str] = None
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None
    driver_status: Optional[str] = None
    driver_updated_at: Optional[str] = None
    player_id: Optional[int] = None



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
    source_hint: Optional[str] = None


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
