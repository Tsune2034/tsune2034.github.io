import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Telegram通知ブリッジ経由で送信（失敗してもメイン処理は止めない） */
async function notify(to: string, message: string, event: string) {
  const bridgeUrl = process.env.OPENCLAW_BRIDGE_URL;
  if (!bridgeUrl) return;
  try {
    await fetch(`${bridgeUrl}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Secret": process.env.OPENCLAW_BRIDGE_SECRET ?? "",
      },
      body: JSON.stringify({ to, message, event }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* 通知失敗は無視 */ }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // 予約確定時にオペレーター・ドライバーへTelegram通知（非同期・ノンブロッキング）
    if (res.ok && data.booking_id) {
      const name = body.name ?? "Guest";
      const plan = body.plan ?? "-";
      const amount = body.total_amount ? `¥${Number(body.total_amount).toLocaleString()}` : "";
      const flight = body.flight_number ? ` / ${body.flight_number}` : "";
      const msg = `📦 [KAIROX] 新規予約 ${data.booking_id}\n${name} / ${plan}${flight} / ${amount}`;
      notify("operator", msg, "booking_created");
      notify("driver", msg, "booking_created");
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    const res = await fetch(`${BACKEND}/bookings/${id}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    const res = await fetch(`${BACKEND}/bookings/${id}/cancel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/bookings/${id}/customer-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/bookings/${id}/driver-location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }
}
