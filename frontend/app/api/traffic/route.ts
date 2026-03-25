import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface CongestionPoint {
  lat: number;
  lng: number;
  congestion_level: "clear" | "slow" | "jam";
  avg_speed_kmh: number;
  route_type: string;
  hour_of_day: number;
  day_of_week: number;
  sample_count: number;
}

export async function GET(req: NextRequest) {
  const hour = req.nextUrl.searchParams.get("hour");
  try {
    const url = `${BACKEND}/congestion${hour ? `?hour=${hour}` : ""}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("backend error");
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}
