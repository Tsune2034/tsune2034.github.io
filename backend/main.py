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
from datetime import datetime, timezone, timedelta

import stripe
import anthropic
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, HTTPException, Depends, Security, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.security import APIKeyHeader
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .models import BriefingRequest, BriefingResponse, Industry, Language, BookingCreate, BookingResponse, MatchResult, DriverLocationUpdate, DriverRegistrationCreate, PlayerCreate, PlayerReviewCreate, PlayerResponse, PlayerLocationUpdate, DispatchResult, MonitorAlert, CustomerMessageCreate, DriverMessageCreate
from .briefing import generate_briefing
from .database import SessionLocal, init_db, save_briefing, get_latest_briefing, BookingRecord, get_booking, save_booking, list_bookings, get_active_drivers, DriverRegistrationRecord, save_driver_registration, list_driver_registrations, PlayerRecord, PlayerReviewRecord, save_player, get_player, get_player_by_email, list_players, save_review, get_reviews_for_player, update_player_score, update_player_location, get_available_players_near, assign_player_to_booking, get_active_bookings_for_monitor, GpsTrackPoint, RouteStats, RouteStatsBand, save_gps_point, get_gps_track, upsert_route_stats, get_route_correction, aggregate_route_to_bands, get_route_stats_all, CongestionSegment, upsert_congestion, get_congestion_data, BookingPhoto, save_photo, get_photos, DutySession, VehicleGps, get_current_duty, start_duty, set_odometer, upsert_vehicle_gps, get_vehicle_gps
from .trust_score import calculate, recalculate_from_reviews
from .matching import find_and_match
from .scheduler import TARGET_JOBS, run_daily_briefings
from .email import send_booking_confirmation
from .ai_ops import ai_dispatch, ai_monitor

load_dotenv()
log = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
_anthropic = anthropic.Anthropic()


# ─── AI confirmation message generator ───
async def generate_ai_message(name: str, booking_id: str, pickup: str, destination: str,
                               total: int, locale: str) -> str:
    locale_map = {"en": "English", "ja": "Japanese", "zh": "Simplified Chinese", "ko": "Korean"}
    lang = locale_map.get(locale, "English")
    status_url = f"https://frontend-psi-seven-15.vercel.app/narita/status/{booking_id}"
    try:
        resp = _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content":
                f"Write a warm, brief booking confirmation in {lang} (2 sentences max). "
                f"Include: booking confirmed for {name}, pickup at {pickup}, delivering to {destination}, "
                f"total ¥{total:,}. End with: track at {status_url}"}]
        )
        return resp.content[0].text if resp.content else ""
    except Exception as e:
        log.warning(f"AI message generation failed: {e}")
        return ""


# ─── Slack Webhook 通知 ───
async def notify_slack(booking_id: str, name: str, phone: str, pickup: str,
                       destination: str, total: int, pay_method: str,
                       pickup_date: str = "") -> None:
    webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        log.info("SLACK_WEBHOOK_URL not set — skipping Slack notification")
        return

    admin_url = f"https://frontend-psi-seven-15.vercel.app/admin"

    # 翌日の予約かチェック（JST基準）
    jst_now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=9)))
    tomorrow_str = (jst_now + timedelta(days=1)).strftime("%Y-%m-%d")
    is_tomorrow = pickup_date and pickup_date.startswith(tomorrow_str)

    priority_text = "\n🚗 *【KAIROX優先】明日の下請けはお断りください！*" if is_tomorrow else ""
    text = (
        f"🔔 *新規予約 `{booking_id}`*{priority_text}"
        f"\n👤 {name}  📞 {phone}"
        f"\n📅 集荷日：{pickup_date or '未設定'}"
        f"\n📍 集荷：{pickup}"
        f"\n🏨 配達先：{destination}"
        f"\n💰 ¥{total:,}（{pay_method}）"
        f"\n🔗 <{admin_url}|管理画面を開く>"
    )
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(webhook_url, json={"text": text})
    except Exception as e:
        log.warning(f"Slack notify failed: {e}")


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
    scheduler.add_job(
        _scheduled_monitor,
        "interval",
        seconds=30,
        id="ai_monitor",
        replace_existing=True,
    )
    scheduler.add_job(
        _scheduled_daily_summary,
        CronTrigger(hour=9, minute=0, timezone="UTC"),  # 18:00 JST
        id="daily_summary",
        replace_existing=True,
    )
    scheduler.start()
    log.info("Scheduler started — daily briefings at 06:00 UTC, AI monitor every 30s, daily summary at 09:00 UTC")

    yield

    scheduler.shutdown()
    log.info("Scheduler stopped")


def _scheduled_briefings():
    db = SessionLocal()
    try:
        run_daily_briefings(db)
    finally:
        db.close()


async def _scheduled_monitor():
    db = SessionLocal()
    try:
        alerts = await ai_monitor(db)
        critical = [a for a in alerts if a.get("type") in ("gps_stale", "ai_summary")]
        if critical:
            log.info(f"[Monitor] {len(alerts)} alerts: {[a['type'] for a in alerts]}")
            await _tg_notify_alerts(critical)
    except Exception as e:
        log.error(f"[Monitor] scheduled run failed: {e}")
    finally:
        db.close()


async def _scheduled_daily_summary():
    """毎日18時JST（09:00 UTC）に運行サマリーをTelegramに送信"""
    db = SessionLocal()
    try:
        from sqlalchemy import func, case
        jst = timezone(timedelta(hours=9))
        now_jst = datetime.now(jst)
        today_str = now_jst.strftime("%Y-%m-%d")

        today_start = datetime(now_jst.year, now_jst.month, now_jst.day, tzinfo=timezone.utc) - timedelta(hours=9)
        today_end = today_start + timedelta(days=1)

        rows = db.query(
            func.count(BookingRecord.id).label("total"),
            func.sum(case((BookingRecord.status == "delivered", 1), else_=0)).label("done"),
            func.coalesce(func.sum(BookingRecord.total_amount), 0).label("revenue"),
        ).filter(
            BookingRecord.created_at >= today_start,
            BookingRecord.created_at < today_end,
        ).first()

        km_row = db.query(func.coalesce(func.sum(DutySession.driven_km), 0)).filter(
            DutySession.start_at >= today_start,
            DutySession.start_at < today_end,
            DutySession.end_at.isnot(None),
        ).scalar()

        msg = "\n".join([
            f"📊 *KAIROX 日次サマリー — {today_str}*",
            f"",
            f"📦 予約: {rows.total or 0}件",
            f"✅ 完了: {rows.done or 0}件",
            f"💴 売上: ¥{(rows.revenue or 0):,}",
            f"🚗 走行: {km_row or 0} km",
        ])
        await _tg_send(msg)
    except Exception as e:
        log.error(f"[DailySummary] failed: {e}")
    finally:
        db.close()


async def _tg_send(text: str) -> None:
    """Telegram にメッセージ送信（バックエンドから直接）"""
    token   = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id:
        log.warning("[TG] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping")
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
                timeout=10,
            )
    except Exception as e:
        log.error(f"[TG] send failed: {e}")


async def _tg_notify_alerts(alerts: list[dict]) -> None:
    lines = ["⚠️ *KAIROX 異常検知*", ""]
    for a in alerts:
        if a.get("type") == "gps_stale":
            lines.append(f"📡 GPS途絶: `{a.get('booking_id')}` — {a.get('stale_min')}分更新なし")
        elif a.get("type") == "ai_summary":
            lines.append(a.get("msg", ""))
    await _tg_send("\n".join(lines))


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
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat(), "version": "v0.16.0"}


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
async def create_booking(req: BookingCreate, db: Session = Depends(get_db)):
    """
    予約を作成し、相乗りマッチング・AI確認メッセージ生成・LINE通知を実行する。
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

    # AI確認メッセージ生成（顧客の言語で）
    ai_message = await generate_ai_message(
        name=req.name,
        booking_id=booking_id,
        pickup=req.pickup_location,
        destination=req.hotel_name or req.destination,
        total=req.total_amount,
        locale=req.locale,
    )

    # AI Dispatcher — 近接プレイヤーを自動アサイン（失敗しても予約は成立）
    try:
        await ai_dispatch(db, booking_id)
    except Exception as e:
        log.warning(f"AI dispatch failed (non-fatal): {e}")

    # Slack通知（オペレーターへ）
    await notify_slack(
        booking_id=booking_id,
        name=req.name,
        phone=req.phone,
        pickup=req.pickup_location,
        destination=req.hotel_name or req.destination,
        total=req.total_amount,
        pay_method=req.pay_method,
        pickup_date=req.pickup_date,
    )

    # 予約確認メール送信（失敗しても予約は成立）
    send_booking_confirmation(
        booking_id=booking_id,
        name=req.name,
        email=req.email,
        plan=req.plan,
        pickup_location=req.pickup_location,
        pickup_date=req.pickup_date,
        hotel_name=req.hotel_name,
        room_number=req.room_number,
        zone=req.zone,
        pay_method=req.pay_method,
        total_amount=req.total_amount,
        extra_bags=req.extra_bags,
        flight_number=req.flight_number,
    )

    return BookingResponse(
        booking_id=booking_id,
        status="confirmed",
        match=match,
        created_at=now.isoformat(),
        ai_message=ai_message,
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
        player_id=record.assigned_player_id,
        customs_exited=record.customs_exited,
        customer_message=record.customer_message,
        customer_message_at=record.customer_message_at.isoformat() if record.customer_message_at else None,
        driver_message=record.driver_message,
        driver_message_at=record.driver_message_at.isoformat() if record.driver_message_at else None,
        destination=record.destination,
        hotel_name=record.hotel_name,
    )


@app.post("/bookings/{booking_id}/customer-message")
def post_customer_message(
    booking_id: str,
    req: CustomerMessageCreate,
    db: Session = Depends(get_db),
):
    """お客が定型メッセージを送る"""
    VALID_KEYS = {"coming_out", "red_bag", "wait_please", "where_driver"}
    if req.message_key not in VALID_KEYS:
        raise HTTPException(status_code=400, detail="invalid message_key")
    record = get_booking(db, booking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")
    record.customer_message = req.message_key
    record.customer_message_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "message_key": req.message_key}


@app.post("/bookings/{booking_id}/driver-message")
def post_driver_message(
    booking_id: str,
    req: DriverMessageCreate,
    db: Session = Depends(get_db),
):
    """ドライバーが定型メッセージをお客に送る"""
    VALID_KEYS = {"coming_now", "delayed", "cant_find"}
    if req.message_key not in VALID_KEYS:
        raise HTTPException(status_code=400, detail="invalid message_key")
    record = get_booking(db, booking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")
    record.driver_message = req.message_key
    record.driver_message_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "message_key": req.message_key}


@app.put("/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
):
    """予約をキャンセルする"""
    record = get_booking(db, booking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")
    if record.status in ("delivered", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel booking with status: {record.status}")
    record.status = "cancelled"
    db.commit()
    return {"ok": True, "booking_id": booking_id, "status": "cancelled"}


@app.delete("/admin/bookings/{booking_id}", dependencies=[Depends(require_api_key)])
def admin_delete_booking(
    booking_id: str,
    db: Session = Depends(get_db),
):
    """管理者用: ステータスに関わらず予約を強制削除"""
    record = get_booking(db, booking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")
    db.delete(record)
    db.commit()
    return {"ok": True, "booking_id": booking_id, "deleted": True}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _calculate_congestion_from_track(db: Session, booking_id: str) -> int:
    """GPS履歴の各区間で速度を計算し congestion_segments を更新。更新点数を返す"""
    track = get_gps_track(db, booking_id)
    if len(track) < 2:
        return 0
    updated = 0
    for i in range(1, len(track)):
        prev, curr = track[i - 1], track[i]
        dt = (curr.recorded_at - prev.recorded_at).total_seconds()
        if dt <= 0 or dt > 120:   # 2分超の飛びはGPS途絶扱い
            continue
        dist_km   = _haversine_km(prev.lat, prev.lng, curr.lat, curr.lng)
        speed_kmh = (dist_km / dt) * 3600
        if speed_kmh > 150:       # GPS誤差除外
            continue
        # 0.05度グリッド（約5km）
        grid_lat = round(curr.lat * 20) / 20
        grid_lng = round(curr.lng * 20) / 20
        grid     = f"{grid_lat},{grid_lng}"
        jst_dt   = curr.recorded_at.astimezone(timezone(timedelta(hours=9)))
        upsert_congestion(db, grid, grid_lat, grid_lng,
                          curr.route_type or "local",
                          jst_dt.hour, jst_dt.weekday(), speed_kmh)
        updated += 1
    if updated:
        db.commit()
    return updated


def _analyze_route_on_complete(db: Session, booking: BookingRecord) -> None:
    """配送完了時: GPS履歴から実走行時間を計算しRouteStatsに保存"""
    track = get_gps_track(db, booking.booking_id)
    if len(track) < 3:
        return  # データ不足

    actual_min = (track[-1].recorded_at - track[0].recorded_at).total_seconds() / 60
    if actual_min < 5 or actual_min > 300:
        return  # 異常値（テスト・忘れ操作等）を除外

    first = track[0]
    last  = track[-1]
    jst_hour   = track[0].recorded_at.astimezone(timezone(timedelta(hours=9))).hour
    pickup_grid = f"{round(first.lat, 1)},{round(first.lng, 1)}"
    dest_grid   = f"{round(last.lat,  1)},{round(last.lng,  1)}"
    # 最後のtrack点のroute_typeを採用（走行中に変更された場合も最終設定を優先）
    route_type  = track[-1].route_type or "local"

    upsert_route_stats(db, pickup_grid, dest_grid, jst_hour, actual_min, route_type)
    log.info(f"[RouteLearn] {booking.booking_id}: {pickup_grid}→{dest_grid} [{route_type}] {actual_min:.1f}min (JST{jst_hour}h)")

    # sample_count >= 20 になったら時間帯別集約を実行
    from .database import RouteStats as RS
    total_samples = (
        db.query(RS)
        .filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid, route_type=route_type)
        .with_entities(RS.sample_count)
        .all()
    )
    total = sum(r.sample_count for r in total_samples)
    if total >= 20:
        aggregate_route_to_bands(db, pickup_grid, dest_grid, route_type)
        log.info(f"[BandLearn] {pickup_grid}→{dest_grid} [{route_type}] 時間帯別集約完了 ({total}件)")

    # 渋滞セグメント解析（速度データをグリッドに蓄積）
    n = _calculate_congestion_from_track(db, booking.booking_id)
    if n:
        log.info(f"[Congestion] {booking.booking_id}: {n}点更新")


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
        record.driver_lng = req.lng
        # GPS学習: 全点を履歴テーブルに保存（route_typeも記録）
        save_gps_point(db, booking_id, req.lat, req.lng, req.driver_status, req.route_type)

    if req.customs_exited is not None:
        record.customs_exited = req.customs_exited

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
        _analyze_route_on_complete(db, record)  # 完了時にルート学習

    db.commit()
    return {"ok": True, "booking_id": booking_id, "driver_status": req.driver_status}


@app.get("/congestion")
def get_congestion(hour: int | None = None, db: Session = Depends(get_db)):
    """渋滞セグメント一覧（/traffic マップ用）"""
    rows = get_congestion_data(db, hour)
    return [
        {
            "lat":              r.lat,
            "lng":              r.lng,
            "congestion_level": r.congestion_level,
            "avg_speed_kmh":    round(r.avg_speed_kmh, 1),
            "route_type":       r.route_type,
            "hour_of_day":      r.hour_of_day,
            "day_of_week":      r.day_of_week,
            "sample_count":     r.sample_count,
        }
        for r in rows
    ]


@app.get("/route-stats/correction")
def get_correction_factor(
    olat: float, olng: float, dlat: float, dlng: float, hour: int,
    route_type: str = "local",
    db: Session = Depends(get_db),
):
    """ETA補正係数を返す。学習データ不足なら correction_factor=1.0"""
    factor = get_route_correction(db, olat, olng, dlat, dlng, hour, route_type)
    return {"correction_factor": factor or 1.0, "has_data": factor is not None, "route_type": route_type}


@app.get("/route-stats")
def get_route_stats_list(db: Session = Depends(get_db)):
    """学習済みルート統計一覧（管理者・ETA補正用）"""
    rows = db.query(RouteStats).order_by(RouteStats.sample_count.desc()).limit(100).all()
    return [
        {
            "pickup_grid":       r.pickup_grid,
            "dest_grid":         r.dest_grid,
            "hour_of_day":       r.hour_of_day,
            "avg_actual_min":    round(r.avg_actual_min, 1),
            "google_est_min":    r.google_est_min,
            "correction_factor": round(r.correction_factor, 3),
            "sample_count":      r.sample_count,
            "updated_at":        r.updated_at.isoformat(),
        }
        for r in rows
    ]


@app.get("/route-stats/summary")
def get_route_stats_summary(db: Session = Depends(get_db)):
    """時間帯別集約済みルート統計サマリー（AdminView GPS学習タブ用）"""
    return get_route_stats_all(db)


@app.post("/bookings/{booking_id}/photos")
def upload_photo(booking_id: str, payload: dict, db: Session = Depends(get_db)):
    """配送証跡写真を保存（受取時・配達完了時）"""
    photo_type = payload.get("photo_type", "pickup")
    data_url   = payload.get("data_url", "")
    if not data_url.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="invalid data_url")
    if len(data_url) > 2_000_000:
        raise HTTPException(status_code=413, detail="image too large (max ~1.5MB)")
    photo = save_photo(db, booking_id, photo_type, data_url)
    return {"id": photo.id, "booking_id": booking_id, "photo_type": photo_type}


@app.get("/bookings/{booking_id}/photos")
def list_photos(booking_id: str, db: Session = Depends(get_db)):
    """配送証跡写真一覧取得"""
    photos = get_photos(db, booking_id)
    return [{"id": p.id, "photo_type": p.photo_type, "data_url": p.data_url, "created_at": p.created_at} for p in photos]


@app.post("/debug/inject-gps-test")
def inject_gps_test(
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    テスト走行データを1件注入（AdminViewのGPS学習タブから呼び出し）。
    成田→新宿ルートのモックGPSトラックを生成し RouteStats に蓄積する。
    """
    route_type = payload.get("route_type", "local")
    booking_id = "TEST-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # 成田空港→新宿 の代表座標
    start_lat, start_lng = 35.7647, 140.3864
    end_lat,   end_lng   = 35.6896, 139.6921

    # モックGPSトラック（出発〜到着まで約60〜90分）
    jst_now = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=9)))
    actual_min = 65.0 + random.uniform(-10, 25)  # 55〜90分のばらつき
    steps = 20
    for i in range(steps + 1):
        t = i / steps
        lat = start_lat + (end_lat - start_lat) * t
        lng = start_lng + (end_lng - start_lng) * t
        recorded_at = datetime.now(timezone.utc) - timedelta(minutes=actual_min * (1 - t))
        db.add(GpsTrackPoint(
            booking_id=booking_id,
            lat=lat, lng=lng,
            driver_status="loaded" if t > 0.1 else "at_pickup",
            route_type=route_type,
            recorded_at=recorded_at,
        ))
    db.commit()

    # RouteStats に蓄積
    pickup_grid = f"{round(start_lat, 1)},{round(start_lng, 1)}"
    dest_grid   = f"{round(end_lat,   1)},{round(end_lng,   1)}"
    hour = jst_now.hour
    upsert_route_stats(db, pickup_grid, dest_grid, hour, actual_min, route_type)

    # 20件到達チェック
    from .database import RouteStats as RS
    total_samples = sum(
        r.sample_count for r in
        db.query(RS).filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid, route_type=route_type).all()
    )
    if total_samples >= 20:
        aggregate_route_to_bands(db, pickup_grid, dest_grid, route_type)
        log.info(f"[BandLearn] テスト投入で20件達成 → 時間帯別集約実行")

    log.info(f"[TestInject] {booking_id} [{route_type}] {actual_min:.1f}min")
    return {"booking_id": booking_id, "route_type": route_type, "actual_min": round(actual_min, 1)}


@app.get("/drivers/active")
def list_active_drivers(db: Session = Depends(get_db)):
    """現在稼働中のドライバー位置一覧（GPSテロップ用・認証不要）"""
    drivers = get_active_drivers(db)
    return [
        {
            "lat": d.driver_lat,
            "lng": d.driver_lng,
            "status": d.driver_status,
            "zone": d.zone,
        }
        for d in drivers
    ]


@app.post("/drivers/register")
def register_driver(req: DriverRegistrationCreate, db: Session = Depends(get_db)):
    """ドライバー登録フォームの送信を保存する"""
    record = DriverRegistrationRecord(
        name=req.name,
        phone=req.phone,
        vehicle=req.vehicle,
        area=req.area,
        style=req.style,
        created_at=datetime.now(timezone.utc),
    )
    save_driver_registration(db, record)
    return {"ok": True}


@app.get("/admin/bookings")
def admin_list_bookings(db: Session = Depends(get_db), _: None = Depends(require_api_key)):
    """全予約一覧（管理者用・APIキー認証必須）"""
    records = list_bookings(db)
    return [
        {
            "booking_id": r.booking_id,
            "status": r.status,
            "name": r.name,
            "zone": r.zone,
            "plan": r.plan,
            "total_amount": r.total_amount,
            "pay_method": r.pay_method,
            "created_at": r.created_at.isoformat(),
            "pickup_date": r.pickup_date or "",
        }
        for r in records
    ]


@app.get("/admin/drivers")
def admin_list_drivers(db: Session = Depends(get_db), _: None = Depends(require_api_key)):
    """ドライバー登録一覧（管理者用・APIキー認証必須）"""
    records = list_driver_registrations(db)
    return [
        {
            "id": r.id,
            "name": r.name,
            "phone": r.phone,
            "vehicle": r.vehicle,
            "area": r.area,
            "style": r.style,
            "created_at": r.created_at.isoformat(),
        }
        for r in records
    ]


# ───────────────────────── Player endpoints ─────────────────────────

@app.post("/players/register", response_model=PlayerResponse)
def register_player(req: PlayerCreate, db: Session = Depends(get_db)):
    """プレイヤー新規登録。重複メールは409を返す。"""
    if get_player_by_email(db, req.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    record = PlayerRecord(
        name=req.name,
        email=req.email,
        phone=req.phone,
        route=req.route,
        id_verified=False,
        completed_jobs=0,
        on_time_jobs=0,
        avg_rating=0.0,
        trust_score=0.0,
        rank="new",
        created_at=datetime.now(timezone.utc),
    )
    saved = save_player(db, record)
    return _player_to_response(saved)


@app.get("/players", response_model=list[PlayerResponse])
def list_players_endpoint(db: Session = Depends(get_db), _: None = Depends(require_api_key)):
    """全プレイヤー一覧（信頼スコア降順・管理者用）"""
    return [_player_to_response(p) for p in list_players(db)]


@app.get("/players/{player_id}", response_model=PlayerResponse)
def get_player_endpoint(player_id: int, db: Session = Depends(get_db)):
    """プレイヤー情報取得（GPS選択画面用）"""
    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return _player_to_response(player)


@app.post("/players/{player_id}/reviews")
def add_review(player_id: int, req: PlayerReviewCreate, db: Session = Depends(get_db)):
    """
    旅行者がレビューを投稿する。
    投稿後、プレイヤーの信頼スコアとランクを自動再計算する。
    """
    if not 1 <= req.rating <= 5:
        raise HTTPException(status_code=400, detail="rating must be 1-5")

    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # レビュー保存
    review = PlayerReviewRecord(
        player_id=player_id,
        booking_id=req.booking_id,
        rating=req.rating,
        on_time=req.on_time,
        comment=req.comment,
        created_at=datetime.now(timezone.utc),
    )
    save_review(db, review)

    # 完了件数・時間厳守件数を更新
    player.completed_jobs += 1
    if req.on_time:
        player.on_time_jobs += 1

    # 全レビューから信頼スコアを再計算
    all_reviews = get_reviews_for_player(db, player_id)
    result = recalculate_from_reviews(
        reviews=[{"rating": r.rating} for r in all_reviews],
        completed_jobs=player.completed_jobs,
        on_time_jobs=player.on_time_jobs,
        id_verified=player.id_verified,
    )
    update_player_score(db, player, result)

    return {
        "ok": True,
        "player_id": player_id,
        "new_score": result.score,
        "new_rank": result.rank,
        "breakdown": result.breakdown,
    }


@app.put("/players/{player_id}/location")
def update_player_location_endpoint(
    player_id: int,
    req: PlayerLocationUpdate,
    db: Session = Depends(get_db),
):
    """
    プレイヤーのGPS位置と待機状態を更新する。
    PlayerView が GPS ON 時に 15〜60 秒ごとに呼び出す。
    """
    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    update_player_location(db, player, req.lat, req.lng, req.is_available)
    return {"ok": True, "player_id": player_id, "lat": req.lat, "lng": req.lng}


@app.get("/players/nearby")
def nearby_players(
    lat: float,
    lng: float,
    radius: float = 3.0,
    db: Session = Depends(get_db),
):
    """
    旅行者のGPS座標から指定半径内の利用可能プレイヤーを返す。
    TrackingView / マッチング画面で使用。
    """
    candidates = get_available_players_near(db, lat, lng, radius)
    return [
        {
            "player_id": p.id,
            "name": p.name,
            "rank": p.rank,
            "trust_score": round(p.trust_score, 1),
            "avg_rating":  round(p.avg_rating, 2),
            "completed_jobs": p.completed_jobs,
            "distance_km": round(dist, 2),
            "eta_min": max(1, round(dist / 5 * 60)),  # 徒歩5km/h想定
        }
        for p, dist in candidates
    ]


@app.put("/players/{player_id}/verify-id")
def verify_player_id(player_id: int, db: Session = Depends(get_db), _: None = Depends(require_api_key)):
    """
    管理者が身分証確認済みにする（+10点・スコア再計算）。
    """
    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player.id_verified = True
    all_reviews = get_reviews_for_player(db, player_id)
    result = recalculate_from_reviews(
        reviews=[{"rating": r.rating} for r in all_reviews],
        completed_jobs=player.completed_jobs,
        on_time_jobs=player.on_time_jobs,
        id_verified=True,
    )
    update_player_score(db, player, result)

    return {
        "ok": True,
        "player_id": player_id,
        "new_score": result.score,
        "new_rank": result.rank,
    }


def _player_to_response(p: PlayerRecord, breakdown: dict | None = None) -> PlayerResponse:
    return PlayerResponse(
        id=p.id,
        name=p.name,
        email=p.email,
        route=p.route,
        id_verified=p.id_verified,
        completed_jobs=p.completed_jobs,
        avg_rating=p.avg_rating,
        trust_score=p.trust_score,
        rank=p.rank,
        breakdown=breakdown,
        created_at=p.created_at.isoformat(),
    )


# ───────────────────────── AI Ops endpoints ─────────────────────────

@app.post("/ai/dispatch/{booking_id}", response_model=DispatchResult)
async def dispatch_booking(booking_id: str, db: Session = Depends(get_db)):
    """
    指定予約に対して AI が最適プレイヤーを選択し自動アサインする。
    予約作成後に自動呼び出し、または手動トリガー可能。
    """
    result = await ai_dispatch(db, booking_id)
    return DispatchResult(**result)


@app.get("/ai/monitor")
async def monitor_deliveries(db: Session = Depends(get_db), _: None = Depends(require_api_key)):
    """
    全アクティブ配送の監視を手動実行する（管理者用）。
    通常は 30 秒ごとに Scheduler が自動実行。
    """
    alerts = await ai_monitor(db)
    return {"alerts": alerts, "count": len(alerts)}


@app.get("/players/{player_id}/assignments")
def get_player_assignments(player_id: int, db: Session = Depends(get_db)):
    """
    プレイヤーにアサインされた予約一覧を返す。
    PlayerView が 10 秒ごとにポーリングして新規アサインを検出する。
    """
    bookings = (
        db.query(BookingRecord)
        .filter(
            BookingRecord.assigned_player_id == player_id,
            BookingRecord.status.notin_(["delivered", "cancelled"]),
        )
        .order_by(BookingRecord.dispatched_at.desc())
        .limit(10)
        .all()
    )
    return [
        {
            "booking_id":       b.booking_id,
            "status":           b.status,
            "pickup_location":  b.pickup_location,
            "hotel_name":       b.hotel_name,
            "plan":             b.plan,
            "extra_bags":       b.extra_bags,
            "total_amount":     b.total_amount,
            "dispatch_reason":  b.dispatch_reason,
            "dispatched_at":    b.dispatched_at.isoformat() if b.dispatched_at else None,
        }
        for b in bookings
    ]


@app.post("/players/{player_id}/upload-id")
async def upload_player_id(
    player_id: int,
    doc_type: str,
    file: "UploadFile",
    db: Session = Depends(get_db),
):
    """
    身分証画像をアップロードする。
    - 対応: license（免許証）/ mynumber（マイナカード表面）/ passport（パスポート）
    - 番号記載面は収集しない（規約・フロントUIで明示）
    - 保存先: /tmp/kairox_ids/（Railway ephemeral）→ 本番は R2 に移行
    """
    player = get_player(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if doc_type not in ("license", "mynumber", "passport"):
        raise HTTPException(status_code=400, detail="Invalid doc_type")

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/heic"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Image files only (JPEG/PNG/WEBP/HEIC)")

    # 保存ディレクトリ
    upload_dir = "/tmp/kairox_ids"
    os.makedirs(upload_dir, exist_ok=True)

    ext      = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    filename = f"player_{player_id}_{doc_type}_{int(datetime.now(timezone.utc).timestamp())}.{ext}"
    path     = os.path.join(upload_dir, filename)

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB上限
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    with open(path, "wb") as f:
        f.write(contents)

    player.id_doc_type = doc_type
    player.id_doc_path = path
    db.commit()

    log.info(f"ID uploaded: player={player_id} type={doc_type} path={path}")
    return {"ok": True, "player_id": player_id, "doc_type": doc_type}


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


@app.get("/stats/today")
def stats_today(db: Session = Depends(get_db)):
    """n8nデイリーレポート用 — 当日(JST)の予約統計"""
    from sqlalchemy import func, case
    jst = timezone(timedelta(hours=9))
    today_jst = datetime.now(jst).date()
    today_start = datetime(today_jst.year, today_jst.month, today_jst.day, tzinfo=timezone.utc) - timedelta(hours=9)
    today_end = today_start + timedelta(days=1)

    rows = db.query(
        func.count(BookingRecord.id).label("total_bookings"),
        func.sum(case((BookingRecord.status == "completed", 1), else_=0)).label("completed"),
        func.sum(case((BookingRecord.status == "pending", 1), else_=0)).label("pending"),
        func.sum(case((BookingRecord.status == "in_transit", 1), else_=0)).label("in_transit"),
        func.coalesce(func.sum(BookingRecord.total_amount), 0).label("total_revenue"),
    ).filter(
        BookingRecord.created_at >= today_start,
        BookingRecord.created_at < today_end,
    ).first()

    return {
        "total_bookings": rows.total_bookings or 0,
        "completed": rows.completed or 0,
        "pending": rows.pending or 0,
        "in_transit": rows.in_transit or 0,
        "total_revenue": rows.total_revenue or 0,
    }


# ─────────────────────────────────────────────────────────────────
# 運行管理 API（Telegram Bot Webhook から呼ばれる）
# ─────────────────────────────────────────────────────────────────

@app.get("/duty/current")
def duty_current(db: Session = Depends(get_db)):
    """現在の勤務セッションを返す（なければ null）"""
    duty = get_current_duty(db)
    if not duty:
        return {"active": False}
    return {
        "active": True,
        "id": duty.id,
        "start_at": duty.start_at.isoformat(),
        "odometer_start": duty.odometer_start,
    }


@app.post("/duty/start")
def duty_start(db: Session = Depends(get_db)):
    """勤務開始（点呼完了）"""
    existing = get_current_duty(db)
    if existing:
        return {
            "ok": True,
            "id": existing.id,
            "start_at": existing.start_at.isoformat(),
            "already_active": True,
        }
    duty = start_duty(db)
    return {"ok": True, "id": duty.id, "start_at": duty.start_at.isoformat()}


class OdometerIn(BaseModel):
    km: int

@app.post("/duty/odometer")
def duty_odometer(req: OdometerIn, db: Session = Depends(get_db)):
    """メーター入力（出庫または帰着）"""
    duty = set_odometer(db, req.km)
    if not duty:
        raise HTTPException(status_code=404, detail="No active duty session")
    result = {
        "ok": True,
        "id": duty.id,
        "odometer_start": duty.odometer_start,
        "odometer_end": duty.odometer_end,
        "driven_km": duty.driven_km,
        "ended": duty.end_at is not None,
    }
    if duty.end_at:
        result["end_at"] = duty.end_at.isoformat()
    return result


class VehicleLocationIn(BaseModel):
    lat: float
    lng: float
    recorded_at: str | None = None

@app.get("/duty/mileage")
def duty_mileage(db: Session = Depends(get_db)):
    """今月の累計走行距離・推定ガソリン代"""
    from sqlalchemy import func
    jst = timezone(timedelta(hours=9))
    now_jst = datetime.now(jst)
    month_start = datetime(now_jst.year, now_jst.month, 1, tzinfo=timezone.utc) - timedelta(hours=9)
    total_km = db.query(func.coalesce(func.sum(DutySession.driven_km), 0)).filter(
        DutySession.start_at >= month_start,
        DutySession.end_at.isnot(None),
    ).scalar() or 0
    fuel_cost = int(total_km * 15)  # ¥15/km 概算（軽バン燃費15km/L・¥165/L想定）
    return {
        "month": now_jst.strftime("%Y-%m"),
        "total_km": total_km,
        "fuel_cost_est": fuel_cost,
    }


@app.post("/vehicle/location")
def vehicle_location_post(req: VehicleLocationIn, db: Session = Depends(get_db)):
    """車両GPS更新 — 現在地（最新1件）+ 学習履歴（GpsTrackPoint）に同時保存"""
    upsert_vehicle_gps(db, req.lat, req.lng)
    save_gps_point(db, "__driver__", req.lat, req.lng, "active")
    db.commit()
    return {"ok": True}


@app.get("/vehicle/location")
def vehicle_location_get(db: Session = Depends(get_db)):
    """最新GPS取得"""
    gps = get_vehicle_gps(db)
    if not gps:
        return {"ok": False}
    return {
        "ok": True,
        "lat": gps.lat,
        "lng": gps.lng,
        "recorded_at": gps.recorded_at.isoformat(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
