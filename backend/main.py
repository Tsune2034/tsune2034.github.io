"""
Kairox — FastAPI REST API
Endpoints for generating and retrieving geopolitical intelligence briefings.
"""

import json
import logging
import os
import random
import string
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import stripe
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, HTTPException, Depends, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .models import BriefingRequest, BriefingResponse, Industry, Language, BookingCreate, BookingResponse, MatchResult, DriverLocationUpdate
from .briefing import generate_briefing
from .database import SessionLocal, init_db, save_briefing, get_latest_briefing, BookingRecord, get_booking, save_booking
from .matching import find_and_match
from .scheduler import TARGET_JOBS, run_daily_briefings

load_dotenv()
log = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _scheduled_briefings,
        CronTrigger(hour=6, minute=0, timezone="UTC"),
        id="daily_briefings",
        replace_existing=True,
    )
    scheduler.start()
    log.info("Scheduler started — daily briefings at 06:00 UTC")

    yield

    scheduler.shutdown()
    log.info("Scheduler stopped")


def _scheduled_briefings():
    """Synchronous wrapper called by APScheduler."""
    db = SessionLocal()
    try:
        run_daily_briefings(db)
    finally:
        db.close()


app = FastAPI(
    title="Kairox Intelligence API",
    description="Geopolitical intelligence briefings powered by Claude AI",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: str | None = Security(_api_key_header)):
    expected = os.getenv("API_KEY")
    if not expected:
        return  # API_KEY未設定の場合は認証スキップ（ローカル開発用）
    if key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ───────────────────────── Payment endpoints ─────────────────────────

@app.post("/payments/create-intent")
async def create_payment_intent(request: Request):
    """Stripe PaymentIntent を作成してクライアントシークレットを返す"""
    body = await request.json()
    amount = int(body.get("amount", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")

    if not stripe.api_key:
        # Stripe未設定時はモックレスポンス（テスト用）
        return {"client_secret": f"pi_mock_{amount}_secret_test"}

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="jpy",
            automatic_payment_methods={"enabled": True},
        )
        return {"client_secret": intent.client_secret}
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ───────────────────────── Booking endpoints ─────────────────────────

def _gen_booking_id() -> str:
    chars = string.ascii_uppercase + string.digits
    return "KRX-" + "".join(random.choices(chars, k=6))


@app.post("/bookings", response_model=BookingResponse)
def create_booking(req: BookingCreate, db: Session = Depends(get_db)):
    """
    予約を作成し、相乗りマッチングを実行する。
    - share_ride=True かつ preferred_slot が設定されている場合、
      同スロット・同ゾーンの未マッチ予約と自動的にグルーピング。
    - グループが成立すると Claude haiku が最適集荷順とETAを計算。
    """
    booking_id = _gen_booking_id()
    now = datetime.now(timezone.utc)

    record = BookingRecord(
        booking_id=booking_id,
        status="confirmed",
        name=req.name,
        email=req.email,
        phone=req.phone,
        plan=req.plan,
        extra_bags=req.extra_bags,
        pickup_location=req.pickup_location,
        pickup_date=req.pickup_date,
        destination=req.destination,
        zone=req.zone,
        hotel_name=req.hotel_name,
        room_number=req.room_number,
        pay_method=req.pay_method,
        total_amount=req.total_amount,
        share_ride=req.share_ride,
        preferred_slot=req.preferred_slot,
        flight_number=req.flight_number,
        created_at=now,
    )
    save_booking(db, record)

    # AI相乗りマッチング
    match = find_and_match(db, booking_id)

    return BookingResponse(
        booking_id=booking_id,
        status="confirmed",
        match=match,
        created_at=now.isoformat(),
    )


@app.get("/bookings/{booking_id}", response_model=BookingResponse)
def get_booking_endpoint(booking_id: str, db: Session = Depends(get_db)):
    """予約情報とマッチ状態を返す"""
    record = get_booking(db, booking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")

    match = MatchResult(match_count=0)
    if record.match_group_id:
        group_size = (
            db.query(BookingRecord)
            .filter_by(match_group_id=record.match_group_id)
            .count()
        )
        order = json.loads(record.route_order_json) if record.route_order_json else None
        match = MatchResult(
            match_count=group_size,
            group_id=record.match_group_id,
            route_order=order,
            estimated_minutes=record.estimated_minutes,
        )

    return BookingResponse(
        booking_id=record.booking_id,
        status=record.status,
        match=match,
        created_at=record.created_at.isoformat(),
        driver_lat=record.driver_lat,
        driver_lng=record.driver_lng,
        driver_status=record.driver_status,
        driver_updated_at=record.driver_updated_at.isoformat() if record.driver_updated_at else None,
    )


@app.put("/bookings/{booking_id}/driver-location")
def update_driver_location(
    booking_id: str,
    req: DriverLocationUpdate,
    db: Session = Depends(get_db),
):
    """ドライバーのスマホGPSから現在位置とステータスを更新する"""
    record = get_booking(db, booking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")

    if req.lat is not None:
        record.driver_lat = req.lat
    if req.lng is not None:
        record.driver_lng = req.lng
    record.driver_status     = req.driver_status
    record.driver_updated_at = datetime.now(timezone.utc)

    # ドライバーステータス → 予約ステータスの連動更新
    if req.driver_status == "heading" and record.status == "confirmed":
        record.status = "pickup"
    elif req.driver_status == "nearby" and record.status in ("confirmed", "pickup"):
        record.status = "transit"
    elif req.driver_status == "arrived" and record.status in ("confirmed", "pickup", "transit"):
        record.status = "transit"
    elif req.driver_status == "done":
        record.status = "delivered"

    db.commit()
    return {"ok": True, "booking_id": booking_id, "driver_status": req.driver_status}


@app.post("/briefing", response_model=BriefingResponse)
def create_briefing(
    req: BriefingRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_api_key),
):
    """
    Generate a new geopolitical intelligence briefing.

    - industry: manufacturing | trading | logistics | finance | tech | general
    - language: en | ja | zh
    - focus_regions: optional list of regions to focus on
    - alert_thresholds: optional dict e.g. {"oil_usd": 120, "usdjpy": 155}
    """
    try:
        result = generate_briefing(req)
        save_briefing(db, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/briefing/latest", response_model=BriefingResponse)
def get_latest_briefing_endpoint(
    industry: Industry = Industry.general,
    language: Language = Language.en,
    db: Session = Depends(get_db),
):
    """
    Retrieve the most recently generated briefing from the database.
    Returns 404 if no briefing has been generated yet for this industry/language.
    """
    result = get_latest_briefing(db, industry.value, language.value)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No briefing found for industry={industry.value}, language={language.value}. Call POST /briefing first."
        )
    return result


@app.get("/industries")
def list_industries():
    return [{"value": i.value, "label": i.value.capitalize()} for i in Industry]


@app.get("/languages")
def list_languages():
    return [
        {"value": "en", "label": "English"},
        {"value": "ja", "label": "日本語"},
        {"value": "zh", "label": "繁體中文"},
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
