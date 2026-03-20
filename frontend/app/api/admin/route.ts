import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.API_KEY ?? "";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (type !== "bookings" && type !== "drivers") {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  try {
    const res = await fetch(`${BACKEND}/admin/${type}`, {
      headers: { "X-API-Key": API_KEY },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
