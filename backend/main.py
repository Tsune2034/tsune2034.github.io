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
from fastapi.security import APIKeyHeader
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .models import BriefingRequest, BriefingResponse, Industry, Language, BookingCreate, BookingResponse, MatchResult, DriverLocationUpdate, DriverRegistrationCreate, PlayerCreate, PlayerReviewCreate, PlayerResponse, PlayerLocationUpdate, DispatchResult, MonitorAlert
from .briefing import generate_briefing
from .database import SessionLocal, init_db, save_briefing, get_latest_briefing, BookingRecord, get_booking, save_booking, list_bookings, get_active_drivers, DriverRegistrationRecord, save_driver_registration, list_driver_registrations, PlayerRecord, PlayerReviewRecord, save_player, get_player, get_player_by_email, list_players, save_review, get_reviews_for_player, update_player_score, update_player_location, get_available_players_near, assign_player_to_booking, get_active_bookings_for_monitor, GpsTrackPoint, RouteStats, RouteStatsBand, save_gps_point, get_gps_track, upsert_route_stats, get_route_correction, aggregate_route_to_bands, get_route_stats_all, CongestionSegment, upsert_congestion, get_congestion_data
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
    scheduler.start()
    log.info("Scheduler started — daily briefings at 06:00 UTC, AI monitor every 30s")

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
        if alerts:
            log.info(f"[Monitor] {len(alerts)} alerts: {[a['type'] for a in alerts]}")
    except Exception as e:
        log.error(f"[Monitor] scheduled run failed: {e}")
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
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat(), "version": "v0.11.0"}


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
    )


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
