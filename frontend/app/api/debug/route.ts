import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    BOT_TOKEN_SET: !!process.env.TELEGRAM_BOT_TOKEN,
    BOT_TOKEN_LEN: process.env.TELEGRAM_BOT_TOKEN?.length ?? 0,
    BOT_TOKEN_PREFIX: process.env.TELEGRAM_BOT_TOKEN?.slice(0, 8) ?? "(empty)",
    CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? "(empty)",
    DRIVER_ID: process.env.TELEGRAM_DRIVER_CHAT_ID ?? "(empty)",
    API_URL: process.env.NEXT_PUBLIC_API_URL ?? "(empty)",
  });
}
