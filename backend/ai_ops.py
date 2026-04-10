"""
KAIROX AI Ops — P0
  - AI Dispatcher: GPS近接マッチングでプレイヤーを自動アサイン
  - AI Monitor:    アクティブ配送の遅延・異常を検知
"""

import json
import logging
import math
from datetime import datetime, timedelta, timezone

import anthropic

log = logging.getLogger(__name__)
_anthropic = anthropic.Anthropic()

# ───────────────────────── 定数 ─────────────────────────
DISPATCH_RADIUS_KM  = 3.0    # マッチング半径（km）
STALL_THRESHOLD_MIN = 10     # GPS停止アラート閾値（分）
STALE_GPS_MIN       = 15     # GPS更新途絶アラート閾値（分）

# ゾーン座標フォールバック（プレイヤーGPSが取れない場合の基準点）
ZONE_COORDS: dict[str, tuple[float, float]] = {
    "narita":  (35.7720, 140.3928),
    "haneda":  (35.5494, 139.7798),
    "chitose": (42.8193, 141.6488),
    "sapporo": (43.0621, 141.3544),
    "otaru":   (43.1907, 140.9947),
}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ───────────────────────── AI Dispatcher ─────────────────────────

async def ai_dispatch(db, booking_id: str) -> dict:
    """
    指定予約に対してGPS近接プレイヤーをAIが選択し自動アサインする。
    Returns: {"ok": bool, "player_id": int|None, "reason": str, "confidence": float}
    """
    from .database import get_booking, get_available_players_near, assign_player_to_booking

    booking = get_booking(db, booking_id)
    if not booking:
        return {"ok": False, "reason": "booking not found", "player_id": None, "confidence": 0.0}

    if booking.assigned_player_id:
        return {"ok": False, "reason": "already assigned", "player_id": booking.assigned_player_id, "confidence": 1.0}

    # ピックアップ座標（予約GPS > ゾーンフォールバック）
    if booking.pickup_lat and booking.pickup_lng:
        ref_lat, ref_lng = booking.pickup_lat, booking.pickup_lng
    else:
        zone = booking.zone or "narita"
        ref_lat, ref_lng = ZONE_COORDS.get(zone, ZONE_COORDS["narita"])

    # 近接プレイヤーを取得（半径内・利用可能・GPSあり）
    candidates = get_available_players_near(db, ref_lat, ref_lng, DISPATCH_RADIUS_KM)

    if not candidates:
        log.info(f"[Dispatch] {booking_id}: No available players within {DISPATCH_RADIUS_KM}km")
        return {"ok": False, "reason": f"no players within {DISPATCH_RADIUS_KM}km", "player_id": None, "confidence": 0.0}

    # プレイヤー情報をAI用に整形
    players_data = []
    for p, dist_km in candidates:
        newbie_bonus = 20 if p.completed_jobs < 5 else 0
        composite = p.trust_score * 0.7 + max(0, 100 - dist_km * 20) * 0.2 + newbie_bonus * 0.1
        players_data.append({
            "player_id": p.id,
            "name": p.name,
            "rank": p.rank,
            "trust_score": round(p.trust_score, 1),
            "avg_rating": round(p.avg_rating, 2),
            "completed_jobs": p.completed_jobs,
            "distance_km": round(dist_km, 2),
            "composite_score": round(composite, 1),
        })

    # Claude に最適プレイヤーを選ばせる
    prompt = f"""You are KAIROX AI Dispatcher. Select the best available player for this delivery.

Booking:
- ID: {booking.booking_id}
- Pickup: {booking.pickup_location or booking.zone}
- Hotel: {booking.hotel_name or booking.destination}
- Plan: {booking.plan}, extra bags: {booking.extra_bags}

Available players (sorted by composite score):
{json.dumps(players_data, ensure_ascii=False, indent=2)}

Composite score = trust(70%) + proximity(20%) + newbie_bonus(10%).
Select ONE player. Prioritize trust and proximity. Give new players occasional chances.

Return ONLY valid JSON, no explanation:
{{"player_id": <int>, "reason": "<15 words max in Japanese>", "confidence": <0.0-1.0>}}"""

    try:
        resp = _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = resp.content[0].text.strip()
        # JSON部分だけ抽出
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        result = json.loads(raw[start:end])

        player_id  = int(result["player_id"])
        reason     = result.get("reason", "AI選択")
        confidence = float(result.get("confidence", 0.8))

        # アサイン実行
        assign_player_to_booking(db, booking_id, player_id, reason)
        log.info(f"[Dispatch] {booking_id} → player:{player_id} ({reason}, conf={confidence:.2f})")

        return {"ok": True, "player_id": player_id, "reason": reason, "confidence": confidence}

    except Exception as e:
        log.error(f"[Dispatch] AI selection failed: {e}")
        # フォールバック: スコア最高のプレイヤーを機械的に選択
        best = players_data[0]
        assign_player_to_booking(db, booking_id, best["player_id"], "スコア最高（フォールバック）")
        return {"ok": True, "player_id": best["player_id"], "reason": "fallback: highest score", "confidence": 0.5}


# ───────────────────────── AI Monitor ─────────────────────────

async def ai_monitor(db) -> list[dict]:
    """
    全アクティブ配送を監視する。
    - GPS更新が途絶したら旅行者に通知（将来実装）
    - driver_status=done なら booking.status を delivered に自動更新
    - 異常検知ログを返す
    Returns: list of alert dicts
    """
    from .database import get_active_bookings_for_monitor, complete_booking_if_done

    now    = datetime.now(timezone.utc)
    alerts = []

    active = get_active_bookings_for_monitor(db)
    log.info(f"[Monitor] Checking {len(active)} active deliveries")

    for booking in active:
        alert_base = {
            "booking_id": booking.booking_id,
            "player_status": booking.driver_status,
            "updated_at": booking.driver_updated_at.isoformat() if booking.driver_updated_at else None,
        }

        # ① done ステータスの自動完了処理
        if booking.driver_status == "done" and booking.status != "delivered":
            complete_booking_if_done(db, booking)
            alerts.append({**alert_base, "type": "auto_completed", "msg": "配達完了を自動確認"})
            continue

        # GPS更新が途絶している場合
        if booking.driver_updated_at:
            # naive datetime（TZ情報なし）を UTC として扱う
            updated = booking.driver_updated_at
            if updated.tzinfo is None:
                updated = updated.replace(tzinfo=timezone.utc)
            stale_min = (now - updated).total_seconds() / 60

            # ② GPS更新途絶（15分以上）
            if stale_min >= STALE_GPS_MIN:
                alerts.append({
                    **alert_base,
                    "type": "gps_stale",
                    "stale_min": round(stale_min, 1),
                    "msg": f"GPS更新が{round(stale_min)}分途絶（圏外の可能性）",
                })

    # アラートがあればClaudeにサマリーを作らせる（1件以上の異常時のみ）
    critical = [a for a in alerts if a["type"] in ("gps_stale",)]
    if critical:
        try:
            summary_prompt = f"""KAIROX配送監視レポート（{now.strftime('%H:%M UTC')}）

検知した異常:
{json.dumps(critical, ensure_ascii=False, indent=2)}

オペレーター向けに3行以内で簡潔にまとめてください（日本語）。"""
            resp = _anthropic.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=150,
                messages=[{"role": "user", "content": summary_prompt}],
            )
            summary = resp.content[0].text.strip()
            log.warning(f"[Monitor] AI Summary:\n{summary}")
            alerts.append({"type": "ai_summary", "msg": summary})
        except Exception as e:
            log.error(f"[Monitor] summary failed: {e}")

    return alerts
