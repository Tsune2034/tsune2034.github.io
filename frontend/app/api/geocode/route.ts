import { NextRequest, NextResponse } from "next/server";

// 住所ジオコーダー（無料・無制限）
// 1. 〒番号 → zipcloud（デジタル庁準拠）
// 2. 住所テキスト → Nominatim OSM（日本全国対応）

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  // 〒番号判定（7桁数字）
  const zipMatch = q.replace(/[〒\-ー－\s]/g, "").match(/^(\d{7})$/);

  if (zipMatch) {
    // zipcloud API（無料・認証不要）
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipMatch[1]}`,
        { next: { revalidate: 86400 } }
      );
      const json = await res.json();
      if (json.results?.[0]) {
        const r = json.results[0];
        const address = `${r.address1}${r.address2}${r.address3}`;
        // 住所からNominatimで座標取得
        const coords = await geocodeAddress(address);
        return NextResponse.json({ address, zip: zipMatch[1], ...coords });
      }
    } catch { /* fallthrough */ }
  }

  // 住所テキストの場合 → Nominatim
  const coords = await geocodeAddress(q);
  return NextResponse.json({ address: q, ...coords });
}

async function geocodeAddress(address: string): Promise<{ lat: number | null; lng: number | null }> {
  try {
    const encoded = encodeURIComponent(address + " 日本");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=jp&format=json&limit=1&addressdetails=0`,
      {
        headers: { "User-Agent": "KAIROX/1.0 (kairox.jp)" },
        next: { revalidate: 3600 },
      }
    );
    const results = await res.json();
    if (results[0]) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    }
  } catch { /* ignore */ }
  return { lat: null, lng: null };
}
