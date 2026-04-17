"""
KAIROX 相乗りマッチングエンジン

フロー:
  1. POST /bookings で新規予約が入ると find_and_match() を呼ぶ
  2. 同スロット × 同ゾーン × 相乗りON × 未マッチの予約を最大2件取得
  3. グループ（2〜3件）が成立したら Claude haiku にルート最適化を依頼
  4. 最適集荷順・推定所要時間をDBに保存して返す
"""

import json
import logging
import os
import re

import anthropic
from sqlalchemy.orm import Session

from .database import BookingRecord, get_unmatched_shareride
from .models import MatchResult

log = logging.getLogger(__name__)
client = anthropic.Anthropic()


def find_and_match(db: Session, booking_id: str) -> MatchResult:
    """新規予約を相乗り候補と照合し、マッチすればClaudeでルート最適化する"""

    booking = db.query(BookingRecord).filter_by(booking_id=booking_id).first()

    # 相乗り不要 / スロット未選択 / 空港行きは対象外
    if (
        not booking
        or not booking.share_ride
        or booking.preferred_slot is None
        or booking.destination != "hotel"
    ):
        return MatchResult(match_count=0)

    candidates = get_unmatched_shareride(
        db,
        slot=booking.preferred_slot,
        zone=booking.zone,
        exclude_id=booking_id,
        limit=2,
    )

    if not candidates:
        return MatchResult(match_count=0)

    # グループ確定（自分 + 候補）
    group: list[BookingRecord] = [booking] + candidates
    group_id = f"GRP-{booking_id[4:]}"   # KRX-XXXXXX → GRP-XXXXXX

    # Claude でルート最適化
    route = _optimize_route(group)

    # DB に書き込み
    for b in group:
        b.match_group_id    = group_id
        b.route_order_json  = json.dumps(route["order"])
        b.estimated_minutes = route["estimated_minutes"]
    db.commit()

    log.info("Matched %d bookings into group %s (ETA %d min)", len(group), group_id, route["estimated_minutes"])

    return MatchResult(
        match_count=len(group),
        group_id=group_id,
        route_order=route["order"],
        estimated_minutes=route["estimated_minutes"],
        route_reason=route.get("reason", ""),
    )


def _optimize_route(bookings: list[BookingRecord]) -> dict:
    """
    Claude haiku に最短集荷順を問い合わせる。
    入力: ホテル名リスト（最大3件）
    出力: {"order": [1,3,2], "estimated_minutes": 45, "reason": "..."}
    """
    items = "\n".join(
        f"{i + 1}. {b.hotel_name or b.pickup_location or '（未指定）'}"
        for i, b in enumerate(bookings)
    )

    prompt = (
        f"KAIROXの荷物集荷ルート最適化タスクです。\n"
        f"同じ配送便に同じエリアで相乗りする{len(bookings)}件の集荷先を、"
        f"最短距離・最短時間になるよう並べ替えてください。\n\n"
        f"集荷先一覧:\n{items}\n\n"
        f"以下のJSON形式のみで回答してください（説明不要）:\n"
        f'{{"order": [番号の配列], "estimated_minutes": 全集荷完了までの推定分数, '
        f'"reason": "並べ替えの理由を1文で"}}'
    )

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            result = json.loads(m.group())
            if isinstance(result.get("order"), list) and isinstance(result.get("estimated_minutes"), int):
                return result
    except Exception as e:
        log.warning("Claude route optimization failed: %s", e)

    # fallback: 元の順序、1件あたり20分
    return {
        "order": list(range(1, len(bookings) + 1)),
        "estimated_minutes": 20 * len(bookings),
        "reason": "デフォルト順",
    }
