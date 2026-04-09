import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const CATEGORY_LABELS: Record<string, string> = {
  booking: "予約・料金",
  driver: "ドライバー応募",
  b2b: "法人・ホテル提携",
  other: "その他",
};

export async function POST(req: NextRequest) {
  const { name, email, category, message, locale } = await req.json().catch(() => ({}));

  if (!name || !email || !message) {
    return NextResponse.json({ error: "name, email, message required" }, { status: 400 });
  }

  const catLabel = CATEGORY_LABELS[category] ?? category ?? "未分類";
  const text = [
    `📬 *KAIROX 問い合わせ*`,
    `🌐 言語: ${locale ?? "?"}`,
    `📁 種別: ${catLabel}`,
    `👤 名前: ${name}`,
    `📧 メール: ${email}`,
    `📝 内容:\n${message}`,
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
