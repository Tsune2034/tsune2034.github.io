"""
Kairox — Database Layer
SQLAlchemy setup + ORM model for persisting briefings.

Local dev: SQLite (kairox.db)
Production: PostgreSQL via DATABASE_URL env var (set automatically by Railway)
"""

import json
import math
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float, text
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

    # ドライバー/プレイヤーGPS
    driver_lat        = Column(Float, nullable=True)
    driver_lng        = Column(Float, nullable=True)
    driver_status     = Column(String(32), nullable=True)
    driver_updated_at = Column(DateTime(timezone=True), nullable=True)

    # 顧客アクション
    customs_exited       = Column(Boolean, default=False, nullable=False, server_default="false")
    customer_message     = Column(String(32), nullable=True)   # coming_out | red_bag | wait_please | where_driver
    customer_message_at  = Column(DateTime(timezone=True), nullable=True)

    # AI Dispatcher
    pickup_lat         = Column(Float, nullable=True)    # 旅行者GPS（将来）
    pickup_lng         = Column(Float, nullable=True)
    assigned_player_id = Column(Integer, nullable=True, index=True)
    dispatch_reason    = Column(String(256), nullable=True)
    dispatched_at      = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False)


# ───────────────────────── GPS学習テーブル ─────────────────────────

class GpsTrackPoint(Base):
    """配送中のGPS履歴（30秒ごと）。ルート学習に使用"""
    __tablename__ = "gps_tracks"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    booking_id    = Column(String(16), nullable=False, index=True)
    lat           = Column(Float, nullable=False)
    lng           = Column(Float, nullable=False)
    driver_status = Column(String(32), nullable=True)
    route_type    = Column(String(16), default="local")  # "highway" | "local"
    recorded_at   = Column(DateTime(timezone=True), nullable=False)


class RouteStats(Base):
    """実走行データから学習したルート別所要時間統計"""
    __tablename__ = "route_stats"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    # 0.1度グリッドで丸めたルート識別（例: "35.7,140.4"）
    pickup_grid       = Column(String(32), nullable=False, index=True)
    dest_grid         = Column(String(32), nullable=False, index=True)
    route_type        = Column(String(16), default="local", index=True)  # "highway" | "local"
    hour_of_day       = Column(Integer, nullable=False)   # JST 0-23
    actual_min        = Column(Float, nullable=False)     # 最新実走行時間
    avg_actual_min    = Column(Float, nullable=False)     # 加重平均
    google_est_min    = Column(Float, nullable=True)      # 参考: Googleの推定値
    correction_factor = Column(Float, default=1.0)        # avg_actual / google_est
    sample_count      = Column(Integer, default=1)
    updated_at        = Column(DateTime(timezone=True), nullable=False)


def save_gps_point(db: Session, booking_id: str, lat: float, lng: float,
                   status: str, route_type: str = "local") -> None:
    db.add(GpsTrackPoint(
        booking_id=booking_id,
        lat=lat,
        lng=lng,
        driver_status=status,
        route_type=route_type,
        recorded_at=datetime.now(timezone.utc),
    ))
    # commit は呼び出し元に任せる


def get_gps_track(db: Session, booking_id: str) -> list["GpsTrackPoint"]:
    return (
        db.query(GpsTrackPoint)
        .filter_by(booking_id=booking_id)
        .order_by(GpsTrackPoint.recorded_at)
        .all()
    )


def upsert_route_stats(
    db: Session,
    pickup_grid: str,
    dest_grid: str,
    hour: int,
    actual_min: float,
    route_type: str = "local",
    google_est_min: float | None = None,
) -> None:
    """既存レコードがあれば加重平均で更新、なければINSERT"""
    existing = (
        db.query(RouteStats)
        .filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid,
                   route_type=route_type, hour_of_day=hour)
        .first()
    )
    if existing:
        n = existing.sample_count
        existing.avg_actual_min    = (existing.avg_actual_min * n + actual_min) / (n + 1)
        existing.actual_min        = actual_min
        existing.sample_count      = n + 1
        if google_est_min:
            existing.google_est_min    = google_est_min
            existing.correction_factor = existing.avg_actual_min / google_est_min
        existing.updated_at = datetime.now(timezone.utc)
    else:
        factor = (actual_min / google_est_min) if google_est_min else 1.0
        db.add(RouteStats(
            pickup_grid=pickup_grid,
            dest_grid=dest_grid,
            route_type=route_type,
            hour_of_day=hour,
            actual_min=actual_min,
            avg_actual_min=actual_min,
            google_est_min=google_est_min,
            correction_factor=factor,
            sample_count=1,
            updated_at=datetime.now(timezone.utc),
        ))
    db.commit()


def _hour_to_band(hour: int) -> str:
    """時刻を4つの時間帯に変換"""
    if 6  <= hour <= 9:  return "morning"   # 朝 6-9時
    if 10 <= hour <= 16: return "daytime"   # 昼 10-16時
    if 17 <= hour <= 23: return "evening"   # 夜 17-23時
    return "midnight"                        # 深夜 0-5時


class RouteStatsBand(Base):
    """sample_count >= 20 になったルートの時間帯別集約統計（高精度補正）"""
    __tablename__ = "route_stats_bands"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    pickup_grid       = Column(String(32), nullable=False, index=True)
    dest_grid         = Column(String(32), nullable=False, index=True)
    route_type        = Column(String(16), default="local", index=True)
    time_band         = Column(String(16), nullable=False)   # morning/daytime/evening/midnight
    avg_actual_min    = Column(Float, nullable=False)
    correction_factor = Column(Float, default=1.0)
    sample_count      = Column(Integer, default=0)
    updated_at        = Column(DateTime(timezone=True), nullable=False)


def aggregate_route_to_bands(db: Session, pickup_grid: str, dest_grid: str,
                              route_type: str) -> None:
    """
    同一ルートの RouteStats を時間帯別に集約し RouteStatsBand を更新。
    sample_count >= 20 のルートに対して呼び出す。
    """
    rows = (
        db.query(RouteStats)
        .filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid, route_type=route_type)
        .all()
    )
    # 時間帯別に集約
    band_data: dict[str, list[float]] = {"morning": [], "daytime": [], "evening": [], "midnight": []}
    band_factors: dict[str, list[float]] = {"morning": [], "daytime": [], "evening": [], "midnight": []}
    for r in rows:
        band = _hour_to_band(r.hour_of_day)
        band_data[band].append(r.avg_actual_min)
        if r.correction_factor:
            band_factors[band].append(r.correction_factor)

    for band, mins in band_data.items():
        if not mins:
            continue
        avg_min    = sum(mins) / len(mins)
        avg_factor = sum(band_factors[band]) / len(band_factors[band]) if band_factors[band] else 1.0
        existing = (
            db.query(RouteStatsBand)
            .filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid,
                       route_type=route_type, time_band=band)
            .first()
        )
        if existing:
            existing.avg_actual_min    = avg_min
            existing.correction_factor = avg_factor
            existing.sample_count      = len(mins)
            existing.updated_at        = datetime.now(timezone.utc)
        else:
            db.add(RouteStatsBand(
                pickup_grid=pickup_grid, dest_grid=dest_grid,
                route_type=route_type, time_band=band,
                avg_actual_min=avg_min, correction_factor=avg_factor,
                sample_count=len(mins),
                updated_at=datetime.now(timezone.utc),
            ))
    db.commit()


def get_route_correction(db: Session, pickup_lat: float, pickup_lng: float,
                         dest_lat: float, dest_lng: float, hour: int,
                         route_type: str = "local") -> float | None:
    """
    学習済みの補正係数を返す。
    sample_count >= 20 なら時間帯別（高精度）、それ以外は時刻別、どちらもなければ None。
    """
    pickup_grid = f"{round(pickup_lat, 1)},{round(pickup_lng, 1)}"
    dest_grid   = f"{round(dest_lat,   1)},{round(dest_lng,   1)}"

    # 時間帯別（高精度）を優先
    band = _hour_to_band(hour)
    band_row = (
        db.query(RouteStatsBand)
        .filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid,
                   route_type=route_type, time_band=band)
        .first()
    )
    if band_row and band_row.sample_count >= 5:
        return band_row.correction_factor

    # フォールバック: 時刻別
    row = (
        db.query(RouteStats)
        .filter_by(pickup_grid=pickup_grid, dest_grid=dest_grid,
                   route_type=route_type, hour_of_day=hour)
        .first()
    )
    if row and row.sample_count >= 3:
        return row.correction_factor
    return None


def get_route_stats_all(db: Session) -> dict:
    """AdminView 用: RouteStats と RouteStatsBand の全サマリー"""
    stats = db.query(RouteStats).order_by(RouteStats.sample_count.desc()).limit(50).all()
    bands = db.query(RouteStatsBand).order_by(RouteStatsBand.sample_count.desc()).all()
    return {
        "hourly": [
            {
                "pickup_grid": r.pickup_grid, "dest_grid": r.dest_grid,
                "route_type": r.route_type, "hour_of_day": r.hour_of_day,
                "avg_actual_min": round(r.avg_actual_min, 1),
                "correction_factor": round(r.correction_factor, 3),
                "sample_count": r.sample_count,
            }
            for r in stats
        ],
        "bands": [
            {
                "pickup_grid": b.pickup_grid, "dest_grid": b.dest_grid,
                "route_type": b.route_type, "time_band": b.time_band,
                "avg_actual_min": round(b.avg_actual_min, 1),
                "correction_factor": round(b.correction_factor, 3),
                "sample_count": b.sample_count,
            }
            for b in bands
        ],
        "total_samples": sum(r.sample_count for r in stats),
        "band_routes": len(set((b.pickup_grid, b.dest_grid, b.route_type) for b in bands)),
    }


# ───────────────────────── 渋滞セグメント ─────────────────────────

def _speed_to_level(speed_kmh: float) -> str:
    if speed_kmh < 10: return "jam"
    if speed_kmh < 25: return "slow"
    return "clear"


class CongestionSegment(Base):
    """GPS速度データから計算した渋滞セグメント（0.05度グリッド ≈ 5km）"""
    __tablename__ = "congestion_segments"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    grid             = Column(String(32), nullable=False, index=True)  # "35.77,140.38"
    lat              = Column(Float, nullable=False)
    lng              = Column(Float, nullable=False)
    route_type       = Column(String(16), default="local")
    hour_of_day      = Column(Integer, nullable=False)
    day_of_week      = Column(Integer, nullable=False)   # 0=月〜6=日
    avg_speed_kmh    = Column(Float, nullable=False)
    congestion_level = Column(String(16), nullable=False)  # "clear"|"slow"|"jam"
    sample_count     = Column(Integer, default=1)
    updated_at       = Column(DateTime(timezone=True), nullable=False)


def upsert_congestion(db: Session, grid: str, lat: float, lng: float,
                      route_type: str, hour: int, dow: int,
                      speed_kmh: float) -> None:
    """加重平均で速度を更新、渋滞レベルを再計算"""
    existing = (
        db.query(CongestionSegment)
        .filter_by(grid=grid, route_type=route_type, hour_of_day=hour, day_of_week=dow)
        .first()
    )
    if existing:
        n = existing.sample_count
        new_avg = (existing.avg_speed_kmh * n + speed_kmh) / (n + 1)
        existing.avg_speed_kmh    = new_avg
        existing.congestion_level = _speed_to_level(new_avg)
        existing.sample_count     = n + 1
        existing.updated_at       = datetime.now(timezone.utc)
    else:
        db.add(CongestionSegment(
            grid=grid, lat=lat, lng=lng,
            route_type=route_type,
            hour_of_day=hour, day_of_week=dow,
            avg_speed_kmh=speed_kmh,
            congestion_level=_speed_to_level(speed_kmh),
            sample_count=1,
            updated_at=datetime.now(timezone.utc),
        ))
    # commit は呼び出し元で一括


def get_congestion_data(db: Session, hour: int | None = None) -> list["CongestionSegment"]:
    q = db.query(CongestionSegment)
    if hour is not None:
        q = q.filter_by(hour_of_day=hour)
    return q.order_by(CongestionSegment.sample_count.desc()).limit(500).all()


class BookingPhoto(Base):
    """配送証跡写真（受取時・配達完了時）"""
    __tablename__ = "booking_photos"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    booking_id  = Column(String(16), nullable=False, index=True)
    photo_type  = Column(String(16), nullable=False)   # "pickup" | "delivery"
    data_url    = Column(Text, nullable=False)          # base64 data URL
    created_at  = Column(DateTime(timezone=True), nullable=False)


def save_photo(db: Session, booking_id: str, photo_type: str, data_url: str) -> BookingPhoto:
    photo = BookingPhoto(
        booking_id=booking_id,
        photo_type=photo_type,
        data_url=data_url,
        created_at=datetime.now(timezone.utc),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def get_photos(db: Session, booking_id: str) -> list[BookingPhoto]:
    return db.query(BookingPhoto).filter_by(booking_id=booking_id).order_by(BookingPhoto.created_at).all()


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


def _run_migrations() -> None:
    """既存テーブルへ新カラムを追加するマイグレーション（べき等）"""
    is_sqlite = DATABASE_URL.startswith("sqlite")
    migrations = [
        # bookings テーブル
        ("bookings", "customs_exited",      "BOOLEAN DEFAULT FALSE NOT NULL" if is_sqlite else "BOOLEAN DEFAULT FALSE"),
        ("bookings", "customer_message",    "VARCHAR(32)"),
        ("bookings", "customer_message_at", "TIMESTAMP" if is_sqlite else "TIMESTAMPTZ"),
    ]
    with engine.connect() as conn:
        for table, column, col_def in migrations:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"))
                conn.commit()
            except Exception:
                conn.rollback()  # カラムが既に存在する場合は無視


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _run_migrations()


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


# ───────────────────────── Player ─────────────────────────

class PlayerRecord(Base):
    __tablename__ = "players"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    name           = Column(String(128), nullable=False)
    email          = Column(String(256), nullable=False, unique=True, index=True)
    phone          = Column(String(32), nullable=False)
    route          = Column(String(16), default="both")   # narita | haneda | both
    id_verified    = Column(Boolean, default=False)
    completed_jobs = Column(Integer, default=0)
    on_time_jobs   = Column(Integer, default=0)
    avg_rating     = Column(Float, default=0.0)
    trust_score    = Column(Float, default=0.0)
    rank           = Column(String(16), default="new")    # new | trusted | elite
    created_at     = Column(DateTime(timezone=True), nullable=False)

    # GPS近接マッチング用
    lat                 = Column(Float, nullable=True)
    lng                 = Column(Float, nullable=True)
    location_updated_at = Column(DateTime(timezone=True), nullable=True)
    is_available        = Column(Boolean, default=False)   # 待機中フラグ

    # 身分証（顔写真面のみ・番号収集不可）
    id_doc_type         = Column(String(32), nullable=True)   # license | mynumber | passport
    id_doc_path         = Column(String(512), nullable=True)  # サーバー保存パス or R2 key


class PlayerReviewRecord(Base):
    __tablename__ = "player_reviews"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    player_id  = Column(Integer, nullable=False, index=True)
    booking_id = Column(String(16), nullable=False)
    rating     = Column(Integer, nullable=False)          # 1〜5
    on_time    = Column(Boolean, default=True)
    comment    = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), nullable=False)


def save_player(db: Session, record: PlayerRecord) -> PlayerRecord:
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_player(db: Session, player_id: int) -> PlayerRecord | None:
    return db.query(PlayerRecord).filter_by(id=player_id).first()


def get_player_by_email(db: Session, email: str) -> PlayerRecord | None:
    return db.query(PlayerRecord).filter_by(email=email).first()


def list_players(db: Session) -> list[PlayerRecord]:
    return db.query(PlayerRecord).order_by(PlayerRecord.trust_score.desc()).all()


def save_review(db: Session, record: PlayerReviewRecord) -> PlayerReviewRecord:
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_reviews_for_player(db: Session, player_id: int) -> list[PlayerReviewRecord]:
    return db.query(PlayerReviewRecord).filter_by(player_id=player_id).all()


def update_player_score(db: Session, player: PlayerRecord, trust_score_result) -> None:
    """TrustScoreオブジェクトをPlayerRecordに反映してコミットする"""
    player.avg_rating     = trust_score_result.avg_rating
    player.trust_score    = trust_score_result.score
    player.rank           = trust_score_result.rank
    player.on_time_jobs   = trust_score_result.completed_jobs - (
        trust_score_result.completed_jobs - int(trust_score_result.on_time_rate * trust_score_result.completed_jobs)
    )
    db.commit()


def update_player_location(db: Session, player: PlayerRecord, lat: float, lng: float, is_available: bool) -> None:
    player.lat                 = lat
    player.lng                 = lng
    player.location_updated_at = datetime.now(timezone.utc)
    player.is_available        = is_available
    db.commit()


def get_available_players_near(
    db: Session, ref_lat: float, ref_lng: float, radius_km: float
) -> list[tuple["PlayerRecord", float]]:
    """利用可能・GPS有効・半径内のプレイヤーを（record, dist_km）のリストで返す（距離昇順）"""
    import math
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=10)
    candidates = (
        db.query(PlayerRecord)
        .filter(
            PlayerRecord.is_available == True,       # noqa: E712
            PlayerRecord.lat.isnot(None),
            PlayerRecord.lng.isnot(None),
            PlayerRecord.location_updated_at.isnot(None),
            PlayerRecord.location_updated_at >= cutoff,
        )
        .all()
    )

    def haversine(lat1, lng1, lat2, lng2):
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    result = []
    for p in candidates:
        dist = haversine(ref_lat, ref_lng, p.lat, p.lng)
        if dist <= radius_km:
            result.append((p, dist))
    result.sort(key=lambda x: x[1])
    return result


def assign_player_to_booking(db: Session, booking_id: str, player_id: int, reason: str) -> None:
    booking = db.query(BookingRecord).filter_by(booking_id=booking_id).first()
    if booking:
        booking.assigned_player_id = player_id
        booking.dispatch_reason    = reason
        booking.dispatched_at      = datetime.now(timezone.utc)
        db.commit()


def get_active_bookings_for_monitor(db: Session) -> list["BookingRecord"]:
    """監視対象: delivered・cancelled以外のGPS更新がある予約"""
    return (
        db.query(BookingRecord)
        .filter(
            BookingRecord.status.notin_(["delivered", "cancelled"]),
            BookingRecord.driver_status.isnot(None),
        )
        .all()
    )


def complete_booking_if_done(db: Session, booking: "BookingRecord") -> None:
    if booking.driver_status == "done":
        booking.status = "delivered"
        db.commit()


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
