import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { booking_id } = await req.json();
  if (!booking_id) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }
  try {
    const res = await fetch(`${BACKEND}/ai/dispatch/${encodeURIComponent(booking_id)}`, {
      method: "POST",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to dispatch" }, { status: 500 });
  }
}
