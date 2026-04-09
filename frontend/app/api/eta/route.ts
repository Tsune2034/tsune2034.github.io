import { NextRequest, NextResponse } from "next/server";

const API_KEY   = process.env.GOOGLE_MAPS_API_KEY ?? "";
const BACKEND   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// xROAD/JARTIC 交通量API（国交省・無料）
// 成田〜都内の主要観測点（IC付近）の渋滞係数を取得して補正
async function getJarticCongestion(hour: number): Promise<number> {
  // 観測点: 千葉東JCT(35.6536,140.2012) / 篠崎IC(35.6920,139.8938) / 箱崎JCT(35.6773,139.7956)
  // JARTIC Open Traffic API — 5分更新・国道交通量
  try {
    const res = await fetch(
      `https://www.jartic-open-traffic.org/api/v1/traffic?lat=35.6773&lon=139.7956&radius=20`,
      { signal: AbortSignal.timeout(3000), next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("jartic error");
    const data = await res.json();
    // avg_travel_time_ratio: 1.0=通常, >1.5=渋滞
    const ratio = data?.avg_travel_time_ratio ?? 1.0;
    return Math.min(1.8, Math.max(1.0, ratio));
  } catch {
    // フォールバック: 時間帯ベースの経験値係数（成田→都内）
    if (hour >= 7 && hour <= 9)   return 1.35; // 朝ラッシュ
    if (hour >= 17 && hour <= 20) return 1.45; // 夜ラッシュ
    if (hour >= 22 || hour <= 5)  return 0.90; // 深夜
    return 1.0;
  }
}

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

  const jstHour = new Date().getUTCHours() + 9 >= 24
    ? new Date().getUTCHours() + 9 - 24
    : new Date().getUTCHours() + 9;

  // API キー未設定 → xROAD/JARTIC交通量で補正した推定値
  if (!API_KEY) {
    const jarticFactor = await getJarticCongestion(jstHour);
    return NextResponse.json({
      durationMin: Math.round((distKm / 30) * 60 * jarticFactor),
      distanceKm: Math.round(distKm * 10) / 10,
      summary: jarticFactor > 1.2 ? "渋滞考慮済み (xROAD)" : "推定",
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
