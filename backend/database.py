"""
Kairox — Database Layer
SQLAlchemy setup + ORM model for persisting briefings.

Local dev: SQLite (kairox.db)
Production: PostgreSQL via DATABASE_URL env var (set automatically by Railway)
"""

import json
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .models import BriefingResponse, KeyEvent, RiskFactor

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kairox.db")

# Railway provides postgres:// URLs; SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class BookingRecord(Base):
    __tablename__ = "bookings"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    booking_id   = Column(String(16), nullable=False, unique=True, index=True)  # KRX-XXXXXX
    status       = Column(String(32), nullable=False, default="confirmed")

    # 連絡先
    name         = Column(String(128), nullable=False)
    email        = Column(String(256), nullable=False)
    phone        = Column(String(32), default="")

    # 配送
    plan              = Column(String(16), nullable=False)
    extra_bags        = Column(Integer, default=0)
    pickup_location   = Column(String(512), default="")
    pickup_date       = Column(String(64), default="")
    destination       = Column(String(16), nullable=False)
    zone              = Column(String(16), default="chitose")
    hotel_name        = Column(String(256), default="")
    room_number       = Column(String(32), default="")

    # 支払い
    pay_method    = Column(String(16), nullable=False)
    total_amount  = Column(Integer, nullable=False)

    # 相乗り
    share_ride        = Column(Boolean, default=True)
    preferred_slot    = Column(Integer, nullable=True)
    flight_number     = Column(String(32), default="")
    match_group_id    = Column(String(32), nullable=True, index=True)
    route_order_json  = Column(Text, nullable=True)
    estimated_minutes = Column(Integer, nullable=True)

    # ドライバーGPS
    driver_lat        = Column(Float, nullable=True)
    driver_lng        = Column(Float, nullable=True)
    driver_status     = Column(String(32), nullable=True)   # heading | nearby | arrived
    driver_updated_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False)


class BriefingRecord(Base):
    __tablename__ = "briefings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    industry = Column(String(64), nullable=False, index=True)
    language = Column(String(8), nullable=False, index=True)
    date = Column(String(16), nullable=False)
    overall_risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(16), nullable=False)
    executive_summary = Column(Text, nullable=False)
    key_events_json = Column(Text, nullable=False, default="[]")
    risk_factors_json = Column(Text, nullable=False, default="[]")
    recommended_actions_json = Column(Text, nullable=False, default="[]")
    alerts_triggered_json = Column(Text, nullable=False, default="[]")
    generated_at = Column(DateTime(timezone=True), nullable=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


# ───────────────────────── Booking CRUD ─────────────────────────

def save_booking(db: Session, record: BookingRecord) -> None:
    db.add(record)
    db.commit()
    db.refresh(record)


def get_booking(db: Session, booking_id: str) -> BookingRecord | None:
    return db.query(BookingRecord).filter_by(booking_id=booking_id).first()


def list_bookings(db: Session, limit: int = 200) -> list[BookingRecord]:
    return db.query(BookingRecord).order_by(BookingRecord.created_at.desc()).limit(limit).all()


def get_active_drivers(db: Session) -> list[BookingRecord]:
    """現在稼働中のドライバー位置情報を返す（直近2時間以内に更新・done以外）"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
    return (
        db.query(BookingRecord)
        .filter(
            BookingRecord.driver_lat.isnot(None),
            BookingRecord.driver_lng.isnot(None),
            BookingRecord.driver_updated_at.isnot(None),
            BookingRecord.driver_updated_at >= cutoff,
            BookingRecord.driver_status.notin_(["done", "delivered"]),
        )
        .all()
    )


# ───────────────────────── Driver Registration ─────────────────────────

class DriverRegistrationRecord(Base):
    __tablename__ = "driver_registrations"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(128), nullable=False)
    phone      = Column(String(32), nullable=False)
    vehicle    = Column(String(32), default="")
    area       = Column(String(64), default="")
    style      = Column(String(16), default="")
    created_at = Column(DateTime(timezone=True), nullable=False)


def save_driver_registration(db: Session, record: "DriverRegistrationRecord") -> None:
    db.add(record)
    db.commit()
    db.refresh(record)


def list_driver_registrations(db: Session) -> list["DriverRegistrationRecord"]:
    return db.query(DriverRegistrationRecord).order_by(DriverRegistrationRecord.created_at.desc()).all()


def get_unmatched_shareride(
    db: Session,
    slot: int,
    zone: str,
    exclude_id: str,
    limit: int = 2,
) -> list[BookingRecord]:
    """同スロット・同ゾーン・未マッチ・相乗りONの予約を返す（自分除く）"""
    return (
        db.query(BookingRecord)
        .filter(
            BookingRecord.preferred_slot == slot,
            BookingRecord.zone == zone,
            BookingRecord.share_ride == True,        # noqa: E712
            BookingRecord.match_group_id == None,    # noqa: E711
            BookingRecord.destination == "hotel",
            BookingRecord.booking_id != exclude_id,
        )
        .order_by(BookingRecord.created_at)
        .limit(limit)
        .all()
    )


def save_briefing(db: Session, briefing: BriefingResponse) -> None:
    record = BriefingRecord(
        industry=briefing.industry,
        language=briefing.language,
        date=briefing.date,
        overall_risk_score=briefing.overall_risk_score,
        risk_level=briefing.risk_level,
        executive_summary=briefing.executive_summary,
        key_events_json=json.dumps([e.model_dump() for e in briefing.key_events], ensure_ascii=False),
        risk_factors_json=json.dumps([r.model_dump() for r in briefing.risk_factors], ensure_ascii=False),
        recommended_actions_json=json.dumps(briefing.recommended_actions, ensure_ascii=False),
        alerts_triggered_json=json.dumps(briefing.alerts_triggered, ensure_ascii=False),
        generated_at=datetime.fromisoformat(briefing.generated_at),
    )
    db.add(record)
    db.commit()


def get_latest_briefing(db: Session, industry: str, language: str) -> BriefingResponse | None:
    record = (
        db.query(BriefingRecord)
        .filter_by(industry=industry, language=language)
        .order_by(BriefingRecord.generated_at.desc())
        .first()
    )
    if record is None:
        return None
    return _record_to_response(record)


def _record_to_response(record: BriefingRecord) -> BriefingResponse:
    return BriefingResponse(
        date=record.date,
        industry=record.industry,
        language=record.language,
        overall_risk_score=record.overall_risk_score,
        risk_level=record.risk_level,
        executive_summary=record.executive_summary,
        key_events=[KeyEvent(**e) for e in json.loads(record.key_events_json)],
        risk_factors=[RiskFactor(**r) for r in json.loads(record.risk_factors_json)],
        recommended_actions=json.loads(record.recommended_actions_json),
        alerts_triggered=json.loads(record.alerts_triggered_json),
        generated_at=record.generated_at.isoformat(),
    )
