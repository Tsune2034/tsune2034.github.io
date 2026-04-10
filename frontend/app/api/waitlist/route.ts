import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(req: NextRequest) {
  const { email, zone, locale } = await req.json().catch(() => ({}));

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const text = [
    `📋 *KAIROX ウェイトリスト登録*`,
    `🌐 言語: ${locale ?? "?"}`,
    `📍 エリア: ${zone ?? "narita"}`,
    `📧 メール: ${email}`,
  ].join("\n");

  if (BOT_TOKEN && CHAT_ID) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
