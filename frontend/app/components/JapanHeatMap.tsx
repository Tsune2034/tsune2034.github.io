"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

// ─── 2024年 JNTO訪日外客実績データ（観光庁・JNTO 2024年確報）───
const HEAT: Record<string, { level: number; en: string; ja: string; count: string; base?: boolean }> = {
  "13": { level: 5, en: "Tokyo",     ja: "東京都",  count: "14.5M visitors" },
  "27": { level: 5, en: "Osaka",     ja: "大阪府",  count: "12.9M visitors" },
  "12": { level: 5, en: "Chiba",     ja: "千葉県",  count: "10.6M visitors", base: true },
  "26": { level: 4, en: "Kyoto",     ja: "京都府",  count: "9.7M visitors" },
  "29": { level: 3, en: "Nara",      ja: "奈良県",  count: "2.9M visitors" },
  "28": { level: 3, en: "Hyogo",     ja: "兵庫県",  count: "3.7M visitors" },
  "40": { level: 3, en: "Fukuoka",   ja: "福岡県",  count: "3.6M visitors" },
  "01": { level: 3, en: "Hokkaido",  ja: "北海道",  count: "2.2M / 10.3M nights" },
  "14": { level: 2, en: "Kanagawa",  ja: "神奈川県", count: "2.5M visitors" },
  "19": { level: 2, en: "Yamanashi", ja: "山梨県",  count: "2.6M visitors" },
  "23": { level: 2, en: "Aichi",     ja: "愛知県",  count: "1.9M visitors" },
  "47": { level: 2, en: "Okinawa",   ja: "沖縄県",  count: "2.6M visitors" },
  "30": { level: 2, en: "Wakayama",  ja: "和歌山県", count: "1.2M visitors" },
  "22": { level: 1, en: "Shizuoka",  ja: "静岡県",  count: "1.9M visitors" },
  "11": { level: 1, en: "Saitama",   ja: "埼玉県",  count: "1.5M visitors" },
  "34": { level: 1, en: "Hiroshima", ja: "広島県",  count: "1.2M visitors" },
  "33": { level: 1, en: "Okayama",   ja: "岡山県",  count: "0.8M visitors" },
  "20": { level: 1, en: "Nagano",    ja: "長野県",  count: "1.0M visitors" },
  "04": { level: 1, en: "Miyagi",    ja: "宮城県",  count: "0.6M visitors" },
};

// ─── 市区町村レベルKAIROX配送エリアデータ ───
const MUNI_HEAT: Record<string, { level: number; en: string; ja: string; note: string }> = {
  // 千葉県
  "12213": { level: 5, en: "Narita",     ja: "成田市",   note: "KAIROX HQ ✈" },
  "12100": { level: 5, en: "Chiba City", ja: "千葉市",   note: "Main base" },
  "12218": { level: 4, en: "Narashino",  ja: "習志野市",  note: "Makuhari area" },
  "12203": { level: 4, en: "Ichikawa",   ja: "市川市",   note: "Key corridor" },
  "12207": { level: 4, en: "Funabashi",  ja: "船橋市",   note: "Key corridor" },
  "12227": { level: 3, en: "Urayasu",    ja: "浦安市",   note: "Disney/Tokyo Bay" },
  "12204": { level: 3, en: "Matsudo",    ja: "松戸市",   note: "Corridor" },
  "12217": { level: 3, en: "Yachiyo",    ja: "八千代市",  note: "Coverage area" },
  // 東京都
  "13106": { level: 5, en: "Taito",     ja: "台東区",   note: "Asakusa/Ueno" },
  "13101": { level: 5, en: "Chiyoda",   ja: "千代田区", note: "Tokyo Station" },
  "13103": { level: 5, en: "Minato",    ja: "港区",    note: "Roppongi/Shiodome" },
  "13104": { level: 4, en: "Shinjuku",  ja: "新宿区",   note: "West hub" },
  "13113": { level: 4, en: "Shibuya",   ja: "渋谷区",   note: "Fashion district" },
  "13116": { level: 4, en: "Toshima",   ja: "豊島区",   note: "Ikebukuro" },
  "13102": { level: 3, en: "Chuo",      ja: "中央区",   note: "Ginza" },
  "13105": { level: 3, en: "Bunkyo",    ja: "文京区",   note: "University area" },
  "13108": { level: 3, en: "Koto",      ja: "江東区",   note: "Odaiba/Ariake" },
  "13111": { level: 3, en: "Shinagawa", ja: "品川区",   note: "Shinagawa hub" },
  // 大阪府
  "27100": { level: 5, en: "Osaka City", ja: "大阪市",  note: "道頓堀/なんば/大阪城" },
  "27140": { level: 3, en: "Sakai",      ja: "堺市",   note: "南部拠点" },
  "27203": { level: 4, en: "Toyonaka",   ja: "豊中市",  note: "伊丹空港近接" },
  "27206": { level: 3, en: "Suita",      ja: "吹田市",  note: "万博記念公園" },
  // 福岡県
  "40130": { level: 4, en: "Fukuoka City", ja: "福岡市", note: "博多/天神 ✈" },
  "40100": { level: 2, en: "Kitakyushu",   ja: "北九州市", note: "工業都市" },
  "40217": { level: 3, en: "Dazaifu",      ja: "太宰府市", note: "観光社寺" },
  // 北海道
  "01100": { level: 4, en: "Sapporo",   ja: "札幌市",  note: "道央拠点 JR 180,098/日" },
  "01202": { level: 3, en: "Hakodate",  ja: "函館市",  note: "観光港町" },
  "01203": { level: 3, en: "Otaru",     ja: "小樽市",  note: "運河エリア" },
  "01393": { level: 4, en: "Kutchan",   ja: "倶知安町", note: "ニセコスキーリゾート" },
  "01221": { level: 2, en: "Obihiro",   ja: "帯広市",  note: "東部拠点" },
};

const COLORS = [
  "rgba(30,41,59,0.4)",    // 0 — no data
  "rgba(59,130,246,0.35)", // 1
  "rgba(37,99,235,0.5)",   // 2
  "rgba(249,115,22,0.55)", // 3
  "rgba(239,68,68,0.7)",   // 4
  "rgba(220,38,38,0.9)",   // 5
];
const STROKE = ["#334155","#93c5fd","#60a5fa","#fb923c","#f87171","#fca5a5"];

// ─── ドリルダウン可能な都道府県 ───
const DRILLABLE = new Set(["12","13","27","40","01"]);

// ─── ドリルダウン用BoundingBox ───
const DRILL_BBOX: Record<string, [number,number,number,number]> = {
  "12": [139.7, 35.0, 141.0, 36.0],
  "13": [139.5, 35.5, 140.0, 35.85],
  "27": [135.0, 34.2, 135.9, 34.95],
  "40": [129.9, 33.3, 130.75, 33.95],
  "01": [139.5, 41.5, 145.8, 45.6],
};
const DRILL_LABELS: Record<string, string> = {
  "12": "千葉県 — KAIROX配送エリア",
  "13": "東京都 — 配送カバレッジ",
  "27": "大阪府 — 関西ハブ",
  "40": "福岡県 — 九州ハブ",
  "01": "北海道 — 千歳（空港）/ 札幌 フェーズ1",
};
const DRILL_MARKER: Record<string, { lat: number; lng: number; label: string }> = {
  "12": { lat: 35.7647, lng: 140.3864, label: "✈ Narita HQ" },
  "13": { lat: 35.6812, lng: 139.7671, label: "🏢 Tokyo" },
  "27": { lat: 34.6937, lng: 135.5023, label: "🏯 Osaka" },
  "40": { lat: 33.5898, lng: 130.4214, label: "🎌 Hakata" },
  "01": { lat: 43.0642, lng: 141.3469, label: "⛷ Sapporo" },
};

// ─── 拠点配送エリア（全国マップ表示用）───
const KAIROX_BASES = [
  { lat: 35.7647, lng: 140.3864, color: "#22c55e", active: true,  label: "成田HQ", r: 18 },
  { lat: 34.6937, lng: 135.5023, color: "#f97316", active: false, label: "大阪",   r: 16 },
  { lat: 33.5898, lng: 130.4214, color: "#3b82f6", active: false, label: "福岡",   r: 14 },
  { lat: 43.0642, lng: 141.3469, color: "#22c55e", active: true,  label: "千歳/札幌", r: 16 },
  { lat: 35.1815, lng: 136.9066, color: "#64748b", active: false, label: "名古屋", r: 13 },
];

// ─── 主要駅乗降客数（MLIT 2023年度）───
const STATIONS_DATA = [
  { lat: 35.6896, lng: 139.7006, label: "新宿",  count: 1473430, color: "#ef4444" },
  { lat: 34.7024, lng: 135.4959, label: "大阪",  count: 813153,  color: "#f97316" },
  { lat: 35.1706, lng: 136.8816, label: "名古屋", count: 324852,  color: "#64748b" },
  { lat: 43.0687, lng: 141.3508, label: "札幌",  count: 180098,  color: "#8b5cf6" },
  { lat: 33.5898, lng: 130.4214, label: "博多",  count: 121011,  color: "#3b82f6" },
];
const MAX_STATION = 1473430;

type TooltipState = { x: number; y: number; code: string; isMuni?: boolean } | null;

const BBOX: [number,number,number,number] = [122.5, 24.0, 146.5, 46.0];
const W = 600; const H = 620;

function project([lng,lat]: [number,number], bbox: [number,number,number,number], w: number, h: number): [number,number] {
  const [minLng,minLat,maxLng,maxLat] = bbox;
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const toMerc = (d: number) => Math.log(Math.tan(Math.PI/4 + (d*Math.PI/180)/2));
  const y = h - ((toMerc(lat) - toMerc(minLat)) / (toMerc(maxLat) - toMerc(minLat))) * h;
  return [x, y];
}

function ringToPath(ring: [number,number][], bbox: [number,number,number,number], w: number, h: number): string {
  return ring.map((c,i) => { const [x,y]=project(c,bbox,w,h); return `${i===0?"M":"L"}${x.toFixed(2)},${y.toFixed(2)}`; }).join(" ")+" Z";
}

function featureToPaths(geometry: { type: string; coordinates: unknown }, bbox: [number,number,number,number], w: number, h: number): string[] {
  const paths: string[] = [];
  if (geometry.type === "Polygon") {
    (geometry.coordinates as [number,number][][]).forEach(r => paths.push(ringToPath(r[0]?r:r as unknown as [number,number][], bbox, w, h)));
    const coords = geometry.coordinates as [number,number][][];
    paths.length = 0;
    paths.push(ringToPath(coords[0], bbox, w, h));
  } else if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as [number,number][][][];
    for (const poly of coords) paths.push(ringToPath(poly[0], bbox, w, h));
  }
  return paths;
}

export default function JapanHeatMap({ locale = "en" }: { locale?: string }) {
  const [paths, setPaths] = useState<{ code: string; d: string; level: number }[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [drillPref, setDrillPref] = useState<string | null>(null);
  const [muniPaths, setMuniPaths] = useState<{ code: string; name: string; d: string; level: number }[]>([]);
  const [muniLoading, setMuniLoading] = useState(false);
  const [showDelivery, setShowDelivery] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("https://raw.githubusercontent.com/digital-go-jp/policy-dashboard-assets/main/data/map/ja_prefecture_area.json");
      const topo = await res.json() as Topology;
      const objKey = Object.keys(topo.objects)[0];
      const geojson = topojson.feature(topo, topo.objects[objKey] as GeometryCollection) as {
        type: string; features: { properties: Record<string,string>; geometry: { type: string; coordinates: unknown } }[];
      };
      const result: { code: string; d: string; level: number }[] = [];
      for (const feat of geojson.features) {
        const code = feat.properties.prefecture_code ?? feat.properties.id ?? "00";
        const level = HEAT[code]?.level ?? 0;
        const dPaths = featureToPaths(feat.geometry, BBOX, W, H);
        for (const d of dPaths) result.push({ code, d, level });
      }
      setPaths(result);
    })();
  }, []);

  const loadMunicipality = useCallback(async (prefCode: string) => {
    setMuniLoading(true);
    try {
      const res = await fetch("https://raw.githubusercontent.com/digital-go-jp/policy-dashboard-assets/main/data/map/ja_municipality_area_with_pref_boundary.json");
      const topo = await res.json() as Topology;
      const objKey = Object.keys(topo.objects)[0];
      const geojson = topojson.feature(topo, topo.objects[objKey] as GeometryCollection) as {
        type: string; features: { properties: Record<string,string>; geometry: { type: string; coordinates: unknown } }[];
      };
      const drillBbox = DRILL_BBOX[prefCode] ?? BBOX;
      const result: { code: string; name: string; d: string; level: number }[] = [];
      for (const feat of geojson.features) {
        const p = feat.properties;
        const pref = p.prefecture_code ?? p.prefCode ?? p.N03_001 ?? "";
        // 都道府県コード 先頭2桁で比較
        const prefStr = pref.padStart(2, "0").slice(0, 2);
        if (prefStr !== prefCode) continue;
        const cityCode = p.city_code ?? p.cityCode ?? p.N03_007 ?? "00000";
        const name = p.city_name ?? p.cityName ?? p.N03_004 ?? p.name ?? "";
        const normalizedCode = cityCode.replace(/-/g, "").padStart(5, "0").slice(0, 5);
        const level = MUNI_HEAT[normalizedCode]?.level ?? 1;
        const dPaths = featureToPaths(feat.geometry, drillBbox, W, H);
        for (const d of dPaths) result.push({ code: normalizedCode, name, d, level });
      }
      setMuniPaths(result);
    } finally {
      setMuniLoading(false);
    }
  }, []);

  const handlePrefClick = useCallback((code: string) => {
    if (!DRILLABLE.has(code)) return;
    setDrillPref(code);
    setTooltip(null);
    loadMunicipality(code);
  }, [loadMunicipality]);

  const heatItem = tooltip
    ? tooltip.isMuni
      ? (() => { const m = MUNI_HEAT[tooltip.code]; return m ? { name: m.ja, sub: m.note, level: m.level } : null; })()
      : (() => { const h = HEAT[tooltip.code]; return h ? { name: locale === "ja" ? h.ja : h.en, sub: h.count, level: h.level } : null; })()
    : null;

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* 凡例 + レイヤートグル */}
      <div className="flex items-center justify-between w-full flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Low</span>
          {[1,2,3,4,5].map(l => (
            <span key={l} className="w-3.5 h-3.5 rounded-sm inline-block border"
              style={{ background: COLORS[l], borderColor: STROKE[l] }} />
          ))}
          <span>High</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: COLORS[5], borderColor: STROKE[5], border:"1px solid" }}>KAIROX</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowDelivery(v => !v)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${showDelivery ? "bg-green-800 text-green-200" : "bg-slate-800 text-slate-500"}`}>
            📦 配送エリア
          </button>
          <button onClick={() => setShowStations(v => !v)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${showStations ? "bg-purple-800 text-purple-200" : "bg-slate-800 text-slate-500"}`}>
            🚉 駅バブル
          </button>
        </div>
      </div>

      {/* ドリルダウン表示 */}
      {drillPref && (
        <div className="flex items-center gap-3 w-full">
          <button onClick={() => { setDrillPref(null); setMuniPaths([]); setTooltip(null); }}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
            ← Japan
          </button>
          <span className="text-sm font-bold text-white">{DRILL_LABELS[drillPref] ?? drillPref}</span>
        </div>
      )}

      {/* SVGマップ */}
      <div className="relative w-full max-w-lg">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto"
          style={{ background: "rgba(15,23,42,0.6)", borderRadius: 12 }}>

          {/* 全国都道府県ビュー */}
          {!drillPref && (
            <>
              {paths.length === 0 && (
                <text x={W/2} y={H/2} textAnchor="middle" fill="#64748b" fontSize={16}>Loading map…</text>
              )}
              {paths.map(({ code, d, level }, i) => (
                <path key={`${code}-${i}`} d={d}
                  fill={COLORS[level]} stroke={STROKE[level]} strokeWidth={level >= 4 ? 1.2 : 0.6}
                  className={`transition-all duration-200 ${DRILLABLE.has(code) ? "cursor-zoom-in" : "cursor-default"} hover:opacity-90`}
                  onMouseEnter={e => { const r = svgRef.current?.getBoundingClientRect(); if(!r) return; setTooltip({ x: e.clientX-r.left, y: e.clientY-r.top, code }); }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePrefClick(code)}
                />
              ))}

              {/* ドリルダウンアイコン */}
              {paths.length > 0 && (() => {
                const pts: [number, number, string][] = [
                  [140.1, 35.6, "12"], [139.7, 35.7, "13"],
                  [135.5, 34.65, "27"], [130.4, 33.6, "40"], [142.0, 43.3, "01"],
                ];
                return <g>{pts.map(([lng,lat,c]) => { const [x,y]=project([lng,lat],BBOX,W,H); return <text key={c} x={x} y={y} fill="white" fontSize={8} textAnchor="middle" style={{pointerEvents:"none"}}>🔍</text>; })}</g>;
              })()}

              {/* 配送エリア円 */}
              {showDelivery && paths.length > 0 && KAIROX_BASES.map((b, i) => {
                const [bx, by] = project([b.lng, b.lat], BBOX, W, H);
                return (
                  <g key={i}>
                    {b.active ? (
                      <>
                        <circle cx={bx} cy={by} r={b.r} fill={b.color} opacity={0.15} stroke={b.color} strokeWidth={1.5} strokeDasharray="3,2" />
                        <circle cx={bx} cy={by} r={6} fill={b.color} opacity={0.9} />
                        <circle cx={bx} cy={by} r={12} fill={b.color} opacity={0.25}>
                          <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.25;0;0.25" dur="2s" repeatCount="indefinite" />
                        </circle>
                      </>
                    ) : (
                      <>
                        <circle cx={bx} cy={by} r={b.r} fill="none" stroke={b.color} strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
                        <circle cx={bx} cy={by} r={4} fill={b.color} opacity={0.6} />
                      </>
                    )}
                    <text x={bx+8} y={by+4} fill={b.color} fontSize={8} fontWeight="bold" style={{pointerEvents:"none"}}>{b.label}</text>
                  </g>
                );
              })}

              {/* 駅乗降客バブル */}
              {showStations && paths.length > 0 && STATIONS_DATA.map((s, i) => {
                const [sx, sy] = project([s.lng, s.lat], BBOX, W, H);
                const r = 4 + (s.count / MAX_STATION) * 14;
                return (
                  <g key={i}>
                    <circle cx={sx} cy={sy} r={r} fill={s.color} opacity={0.25} stroke={s.color} strokeWidth={0.8} />
                    <text x={sx} y={sy+3} fill="white" fontSize={7} textAnchor="middle" fontWeight="bold" style={{pointerEvents:"none"}}>{s.label}</text>
                  </g>
                );
              })}
            </>
          )}

          {/* 市区町村ドリルダウンビュー */}
          {drillPref && (
            <>
              {muniLoading && (
                <text x={W/2} y={H/2} textAnchor="middle" fill="#64748b" fontSize={16}>Loading…</text>
              )}
              {muniPaths.map(({ code, d, level }, i) => (
                <path key={`muni-${code}-${i}`} d={d}
                  fill={COLORS[level]} stroke={STROKE[level]} strokeWidth={MUNI_HEAT[code] ? 1.5 : 0.5}
                  className="transition-all duration-200 cursor-pointer hover:opacity-80"
                  onMouseEnter={e => { const r = svgRef.current?.getBoundingClientRect(); if(!r) return; setTooltip({ x: e.clientX-r.left, y: e.clientY-r.top, code, isMuni: true }); }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
              {/* ドリルダウンマーカー */}
              {!muniLoading && drillPref && DRILL_MARKER[drillPref] && (() => {
                const dm = DRILL_MARKER[drillPref];
                const drillBbox = DRILL_BBOX[drillPref] ?? BBOX;
                const [nx, ny] = project([dm.lng, dm.lat], drillBbox, W, H);
                return (
                  <g>
                    <circle cx={nx} cy={ny} r={10} fill="#ef4444" opacity={0.9} />
                    <circle cx={nx} cy={ny} r={16} fill="#ef4444" opacity={0.3}>
                      <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={nx+14} y={ny+4} fill="white" fontSize={11} fontWeight="bold">{dm.label}</text>
                  </g>
                );
              })()}
            </>
          )}
        </svg>

        {/* ツールチップ */}
        {tooltip && heatItem && (
          <div className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg text-sm shadow-xl"
            style={{ left: tooltip.x+12, top: tooltip.y-40, background:"rgba(15,23,42,0.95)", border:`1px solid ${STROKE[heatItem.level]}`, color:"white", minWidth:140 }}>
            <div className="font-bold">{heatItem.name}</div>
            <div className="text-xs mt-0.5" style={{ color: STROKE[heatItem.level] }}>{heatItem.sub}</div>
            {!tooltip.isMuni && DRILLABLE.has(tooltip.code) && (
              <div className="text-[10px] mt-1 text-slate-400">🔍 Click to zoom</div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Data: JNTO 2024年訪日外客統計（確報）× デジタル庁 行政区域データ 2025年版（CC BY 4.0）× 国土交通省 MLIT 駅別乗降客数
      </p>
    </div>
  );
}
