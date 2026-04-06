import { NextResponse } from "next/server";

// 気象庁 千葉県予報API プロキシ（CORS回避）
// エリアコード 120000 = 千葉県（成田空港含む）
const JMA_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast/120000.json";

// 台風・暴風系の天気コード
const SEVERE_CODES = new Set([
  "300","302","303","308","309","313","314","315","316","317",
  "320","321","323","324","325","326","327","328","329","340",
  "350","361","371","400","401","402","403","405","406","407",
  "409","411","413","414","420","421","422","423","424","425",
  "426","427","450",
]);
const TYPHOON_WORDS = ["台風","暴風","大雨","暴雨","特別警報","警報"];

export async function GET() {
  try {
    const res = await fetch(JMA_URL, {
      next: { revalidate: 3600 }, // 1時間キャッシュ
    });
    if (!res.ok) throw new Error("JMA fetch failed");
    const data = await res.json();

    const area = data[0];
    const timeSeries = area?.timeSeries ?? [];

    // 千葉北西部エリア（成田周辺）
    const weatherSeries = timeSeries[0];
    const areas = weatherSeries?.areas ?? [];
    const targetArea =
      areas.find((a: { area?: { code?: string } }) => a.area?.code === "130010") ?? areas[0];

    const weatherCodes: string[] = targetArea?.weatherCodes ?? [];
    const weathers: string[] = targetArea?.weathers ?? [];
    const winds: string[] = targetArea?.winds ?? [];

    const rainSeries = timeSeries[1];
    const rainAreas = rainSeries?.areas ?? [];
    const rainArea =
      rainAreas.find((a: { area?: { code?: string } }) => a.area?.code === "130010") ?? rainAreas[0];
    const pops: string[] = rainArea?.pops ?? [];

    // 悪天候判定
    const hasSevereCode = weatherCodes.slice(0, 4).some((c) => SEVERE_CODES.has(c));
    const hasTyphoonWord = weathers.slice(0, 4).some((w) =>
      TYPHOON_WORDS.some((t) => w.includes(t))
    );
    const maxPop = Math.max(...pops.slice(0, 4).map((p) => parseInt(p) || 0));
    const hasHeavyRain = maxPop >= 70;
    const hasHighWind = winds.slice(0, 4).some(
      (w) => w.includes("非常に強") || w.includes("暴風")
    );

    const severe = hasSevereCode || hasTyphoonWord || hasHeavyRain || hasHighWind;

    return NextResponse.json({
      severe,
      weather: weathers[0] ?? "",
      wind: winds[0] ?? "",
      pop: maxPop,
      typhoon: hasTyphoonWord,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ severe: false, error: true }, { status: 200 });
  }
}
