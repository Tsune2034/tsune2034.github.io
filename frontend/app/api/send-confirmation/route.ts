import { NextRequest, NextResponse } from "next/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM ?? "KAIROX <noreply@kairox.app>";
const STATUS_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://frontend-psi-seven-15.vercel.app";

const SUBJECTS: Record<string, string> = {
  en: "KAIROX — Booking Confirmed",
  ja: "KAIROX — 予約確認",
  zh: "KAIROX — 预订确认",
  ko: "KAIROX — 예약 확인",
};

function buildHtml(name: string, bookingId: string, destination: string, total: number, locale: string): string {
  const trackingUrl = `${STATUS_BASE}/narita/status/${bookingId}`;

  const messages: Record<string, { greeting: string; body: string; trackBtn: string; footer: string }> = {
    en: {
      greeting: `Hi ${name},`,
      body: `Your luggage delivery has been booked. We'll pick it up and deliver it to <strong>${destination}</strong>.`,
      trackBtn: "Track My Delivery",
      footer: "Travel Japan hands-free. — KAIROX Team",
    },
    ja: {
      greeting: `${name} 様、`,
      body: `ご予約ありがとうございます。荷物を集荷し、<strong>${destination}</strong> へお届けします。`,
      trackBtn: "配達を追跡する",
      footer: "日本を、手ぶらで。— KAIROX チーム",
    },
    zh: {
      greeting: `您好 ${name}，`,
      body: `您的行李配送已预订成功。我们将取件并送到 <strong>${destination}</strong>。`,
      trackBtn: "追踪我的配送",
      footer: "畅游日本，轻装出行。— KAIROX 团队",
    },
    ko: {
      greeting: `안녕하세요 ${name}님,`,
      body: `예약이 완료되었습니다. 짐을 픽업하여 <strong>${destination}</strong>으로 배송해 드립니다.`,
      trackBtn: "배송 추적하기",
      footer: "일본을 손 가볍게. — KAIROX 팀",
    },
  };

  const m = messages[locale] ?? messages.en;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1c;font-family:sans-serif;color:#e5e7eb">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#111827;border-radius:16px;border:1px solid #1f2937">
    <div style="margin-bottom:24px">
      <span style="font-size:18px;font-weight:900;color:#fff;letter-spacing:0.05em">KAIROX</span>
      <span style="margin-left:8px;font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);color:#fbbf24">Japan Luggage Freedom</span>
    </div>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 8px">${m.greeting}</p>
    <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 24px">${m.body}</p>
    <div style="background:#1f2937;border:1px solid #374151;border-radius:12px;padding:16px;margin-bottom:24px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#6b7280">Booking ID</span>
        <span style="color:#fff;font-family:monospace;font-weight:700">${bookingId}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#6b7280">Destination</span>
        <span style="color:#d1d5db">${destination}</span>
      </div>
      <div style="border-top:1px solid #374151;padding-top:12px;margin-top:4px;display:flex;justify-content:space-between">
        <span style="color:#6b7280">Total</span>
        <span style="color:#fff;font-size:18px;font-weight:900">¥${total.toLocaleString()}</span>
      </div>
    </div>
    <a href="${trackingUrl}" style="display:block;text-align:center;background:#f59e0b;color:#111;font-weight:700;font-size:14px;padding:14px;border-radius:12px;text-decoration:none">
      ${m.trackBtn} →
    </a>
    <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px">${m.footer}</p>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const { email, name, booking_id, destination, total, locale } = await req.json();

  if (!email || !booking_id) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (!RESEND_API_KEY) {
    // Resend未設定でも予約フローをブロックしない
    return NextResponse.json({ ok: true, note: "RESEND_API_KEY not set" });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: SUBJECTS[locale] ?? SUBJECTS.en,
      html: buildHtml(name ?? "Guest", booking_id, destination ?? "", total ?? 0, locale ?? "en"),
    }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
