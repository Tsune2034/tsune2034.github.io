import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export interface EtaResult {
  durationMin: number;
  distanceKm: number;
  summary: string; // e.g. "首都高速経由"
  source: "google" | "estimate";
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
    return NextResponse.json({
      durationMin: Math.round(leg.duration.value / 60),
      distanceKm:  Math.round(leg.distance.value / 100) / 10,
      summary:     json.routes[0].summary ?? "",
      source:      "google",
    } satisfies EtaResult);

  } catch (err) {
    console.error("[eta API]", err);
    // フォールバック
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
