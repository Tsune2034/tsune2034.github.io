"""
KAIROX — 予約確認メール送信（Resend）
RESEND_API_KEY が未設定の場合は無音でスキップする。
"""

import logging
import os

log = logging.getLogger(__name__)

PLAN_LABELS = {
    "solo":   "Solo（スーツケース1個）",
    "pair":   "Pair（スーツケース2個）",
    "family": "Family（スーツケース4個）",
}
PAY_LABELS = {
    "credit": "クレジットカード",
    "jpyc":   "JPYC（Polygon）",
    "usdc":   "USDC（Solana）",
}
ZONE_LABELS = {
    "chitose": "千歳エリア",
    "sapporo": "札幌エリア",
    "otaru":   "小樽エリア",
    "furano":  "富良野・美瑛エリア",
}

APP_URL = os.getenv("APP_URL", "https://kairox.jp")
FROM_ADDRESS = os.getenv("RESEND_FROM", "KAIROX <onboarding@resend.dev>")


def _build_html(
    booking_id: str,
    name: str,
    plan: str,
    pickup_location: str,
    pickup_date: str,
    hotel_name: str,
    room_number: str,
    zone: str,
    pay_method: str,
    total_amount: int,
    extra_bags: int,
    flight_number: str,
) -> str:
    plan_label    = PLAN_LABELS.get(plan, plan)
    pay_label     = PAY_LABELS.get(pay_method, pay_method)
    zone_label    = ZONE_LABELS.get(zone, zone)
    extra_str     = f"　追加荷物：{extra_bags}個" if extra_bags > 0 else ""
    flight_str    = f"　フライト番号：{flight_number}" if flight_number else ""
    room_str      = f"　部屋番号：{room_number}" if room_number else ""
    tracking_url  = f"{APP_URL}?track={booking_id}"

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>KAIROX ご予約確認</title>
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#111827;border-radius:16px 16px 0 0;padding:32px 32px 24px;border-bottom:2px solid #f59e0b;">
          <p style="margin:0;font-size:24px;font-weight:900;letter-spacing:0.1em;color:#ffffff;">KAIROX</p>
          <p style="margin:6px 0 0;font-size:13px;color:#f59e0b;">Hands-Free Sightseeing Delivery</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#111827;padding:32px;">

          <p style="margin:0 0 8px;font-size:15px;color:#e5e7eb;">{name} 様</p>
          <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
            ご予約ありがとうございます。以下の内容で承りました。
          </p>

          <!-- Tracking number -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1408;border:2px solid #f59e0b;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#f59e0b;letter-spacing:0.1em;text-transform:uppercase;">追跡番号 / Tracking Number</p>
                <p style="margin:0;font-size:28px;font-weight:900;color:#fbbf24;letter-spacing:0.15em;font-family:'Courier New',monospace;">{booking_id}</p>
              </td>
            </tr>
          </table>

          <!-- Details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#e5e7eb;">予約詳細</p>
                {_row("プラン", plan_label + extra_str)}
                {_row("集荷場所", pickup_location)}
                {_row("集荷日", pickup_date or "当日対応")}
                {_row("配送エリア", zone_label)}
                {_row("配送先ホテル", hotel_name + room_str)}
                {_row("お支払い", pay_label)}
                {_row("合計金額", f"¥{total_amount:,}")}
                {f'<tr><td style="padding:6px 0;font-size:12px;color:#6b7280;">{flight_str}</td></tr>' if flight_str else ""}
              </td>
            </tr>
          </table>

          <!-- Track button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td align="center">
                <a href="{tracking_url}"
                   style="display:inline-block;background:#f59e0b;color:#111827;font-weight:700;font-size:14px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
                  📍 配送状況をリアルタイムで追跡する
                </a>
              </td>
            </tr>
          </table>

          <!-- Cancel policy -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#9ca3af;">キャンセルポリシー</p>
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">✓ 予約から10分以内：全額返金</p>
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">△ 10分後〜集荷前：90%返金</p>
                <p style="margin:0;font-size:12px;color:#6b7280;">✗ 集荷後：返金不可</p>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.8;">
            ご不明な点はアプリ内のAIチャット（💬）または<br>
            このメールへの返信にてお問い合わせください。
          </p>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#0d1117;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid #1f2937;">
          <p style="margin:0;font-size:11px;color:#374151;text-align:center;">
            KAIROX — 北海道インバウンド手荷物配送サービス<br>
            {APP_URL}
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


def _row(label: str, value: str) -> str:
    if not value:
        return ""
    return f"""<tr>
      <td style="padding:5px 0;font-size:12px;color:#6b7280;width:120px;vertical-align:top;">{label}</td>
      <td style="padding:5px 0;font-size:12px;color:#e5e7eb;font-weight:600;">{value}</td>
    </tr>"""


def send_booking_confirmation(
    booking_id: str,
    name: str,
    email: str,
    plan: str,
    pickup_location: str,
    pickup_date: str,
    hotel_name: str,
    room_number: str,
    zone: str,
    pay_method: str,
    total_amount: int,
    extra_bags: int = 0,
    flight_number: str = "",
) -> None:
    """予約確認メールを送信する。API キー未設定または email 空の場合は無音でスキップ。"""
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key or not email:
        log.info("Resend skip: api_key=%s email=%s", bool(api_key), bool(email))
        return

    try:
        import resend
        resend.api_key = api_key

        html = _build_html(
            booking_id=booking_id,
            name=name,
            plan=plan,
            pickup_location=pickup_location,
            pickup_date=pickup_date,
            hotel_name=hotel_name,
            room_number=room_number,
            zone=zone,
            pay_method=pay_method,
            total_amount=total_amount,
            extra_bags=extra_bags,
            flight_number=flight_number,
        )

        resend.Emails.send({
            "from": FROM_ADDRESS,
            "to": [email],
            "subject": f"【KAIROX】ご予約確認 {booking_id}",
            "html": html,
        })
        log.info("Confirmation email sent: %s → %s", booking_id, email)

    except Exception as e:
        # メール送信失敗は予約に影響させない
        log.warning("Email send failed for %s: %s", booking_id, e)
