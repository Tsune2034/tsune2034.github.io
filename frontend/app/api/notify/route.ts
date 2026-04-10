/**
 * POST /api/notify
 *
 * KAIROX → OpenClaw ブリッジ経由で LINE / WhatsApp に通知を送る。
 *
 * 環境変数:
 *   OPENCLAW_BRIDGE_URL    - ブリッジサーバーURL (例: https://xxxx.ngrok.io)
 *   OPENCLAW_BRIDGE_SECRET - 認証シークレット
 */

import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL;
const BRIDGE_SECRET = process.env.OPENCLAW_BRIDGE_SECRET ?? "";

export interface NotifyPayload {
  to: string;       // 送信先（電話番号 or LINE ID）
  message: string;  // メッセージ本文
  event?: string;   // イベント種別（ログ用）
}

export async function POST(req: NextRequest) {
  if (!BRIDGE_URL) {
    // ブリッジ未設定時はスキップ（エラーにしない）
    return NextResponse.json(
      { ok: false, skipped: true, reason: "OPENCLAW_BRIDGE_URL not configured" },
      { status: 200 }
    );
  }

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { to, message, event } = payload;
  if (!to || !message) {
    return NextResponse.json({ error: "to and message are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Secret": BRIDGE_SECRET,
      },
      body: JSON.stringify({ to, message, event }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: "Bridge error", detail: data }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Bridge unreachable", detail: msg }, { status: 503 });
  }
}
