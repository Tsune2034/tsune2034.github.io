import { NextRequest, NextResponse } from "next/server";

const PINS: Record<string, string | undefined> = {
  driver: process.env.DRIVER_PIN,
  player: process.env.PLAYER_PIN,
  admin:  process.env.ADMIN_PIN,
};

export async function POST(req: NextRequest) {
  const { pin, role } = await req.json().catch(() => ({}));

  if (!pin || !role || !(role in PINS)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const expected = PINS[role];
  if (!expected) {
    // 環境変数未設定の場合はアクセス不可
    return NextResponse.json({ ok: false, error: "PIN not configured" }, { status: 503 });
  }

  return NextResponse.json({ ok: pin === expected });
}
