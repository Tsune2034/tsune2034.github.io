import { NextRequest, NextResponse } from "next/server";

const API_KEY   = process.env.GOOGLE_MAPS_API_KEY ?? "";
const BACKEND   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface EtaResult {
  durationMin: number;
  distanceKm: number;
  summary: string; // e.g. "首都高速経由"
  source: "google" | "estimate" | "learned"; // learned = 自社学習補正済み
  correctionFactor?: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const originLat  = searchParams.get("olat");
  const originLng  = searchParams.get("olng");
  const destLat    = searchParams.get("dlat");
  const destLng    = searchParams.get("dlng");

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: "olat, olng, dlat, dlng required" }, { status: 400 });
  }

  const distKm = haversine(
    parseFloat(originLat), parseFloat(originLng),
    parseFloat(destLat),   parseFloat(destLng),
  );

  // API キー未設定はフォールバック
  if (!API_KEY) {
    return NextResponse.json({
      durationMin: Math.round((distKm / 30) * 60),
      distanceKm: Math.round(distKm * 10) / 10,
      summary: "推定",
      source: "estimate",
    } satisfies EtaResult);
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin",      `${originLat},${originLng}`);
    url.searchParams.set("destination", `${destLat},${destLng}`);
    url.searchParams.set("mode",        "driving");
    url.searchParams.set("language",    "ja");
    url.searchParams.set("key",         API_KEY);

    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    const json = await res.json();

    if (json.status !== "OK" || !json.routes?.length) {
      throw new Error(`Directions API: ${json.status}`);
    }

    const leg = json.routes[0].legs[0];
    const googleMin = Math.round(leg.duration.value / 60);

    // 学習済み補正係数を取得（バックエンドから）
    let correctionFactor = 1.0;
    try {
      const hour = new Date().getHours(); // JST近似
      const statsUrl = `${BACKEND}/route-stats/correction?olat=${originLat}&olng=${originLng}&dlat=${destLat}&dlng=${destLng}&hour=${hour}`;
      const statsRes = await fetch(statsUrl, { next: { revalidate: 300 } });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        if (stats.correction_factor) correctionFactor = stats.correction_factor;
      }
    } catch {
      // 学習データなし → 補正なし
    }

    const learnedMin = Math.round(googleMin * correctionFactor);
    return NextResponse.json({
      durationMin:      learnedMin,
      distanceKm:       Math.round(leg.distance.value / 100) / 10,
      summary:          json.routes[0].summary ?? "",
      source:           correctionFactor !== 1.0 ? "learned" : "google",
      correctionFactor: correctionFactor !== 1.0 ? correctionFactor : undefined,
    } satisfies EtaResult);

  } catch (err) {
    console.error("[eta API]", err);
    return NextResponse.json({
      durationMin: Math.round((distKm / 30) * 60),
      distanceKm: Math.round(distKm * 10) / 10,
      summary: "推定",
      source: "estimate",
    } satisfies EtaResult);
  }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
