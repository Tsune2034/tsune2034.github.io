"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

// ─── 2024年 JNTO訪日外客実績データ（観光庁・JNTO 2024年確報）───
// 総数: 36,869,900人（2024年）
const HEAT: Record<string, { level: number; en: string; ja: string; count: string }> = {
  "13": { level: 5, en: "Tokyo",     ja: "東京都",  count: "17.9M visits" },
  "12": { level: 5, en: "Chiba",     ja: "千葉県",  count: "KAIROX Base ✈" },
  "14": { level: 4, en: "Kanagawa",  ja: "神奈川県", count: "7.9M visits" },
  "27": { level: 4, en: "Osaka",     ja: "大阪府",  count: "11.4M visits" },
  "26": { level: 3, en: "Kyoto",     ja: "京都府",  count: "7.0M visits" },
  "01": { level: 3, en: "Hokkaido",  ja: "北海道",  count: "4.5M visits" },
  "28": { level: 3, en: "Hyogo",     ja: "兵庫県",  count: "3.7M visits" },
  "23": { level: 2, en: "Aichi",     ja: "愛知県",  count: "3.1M visits" },
  "40": { level: 2, en: "Fukuoka",   ja: "福岡県",  count: "3.4M visits" },
  "47": { level: 2, en: "Okinawa",   ja: "沖縄県",  count: "2.6M visits" },
  "22": { level: 1, en: "Shizuoka",  ja: "静岡県",  count: "1.9M visits" },
  "11": { level: 1, en: "Saitama",   ja: "埼玉県",  count: "1.5M visits" },
  "33": { level: 1, en: "Okayama",   ja: "岡山県",  count: "0.8M visits" },
  "34": { level: 1, en: "Hiroshima", ja: "広島県",  count: "1.2M visits" },
};

// ─── 千葉・東京 市区町村レベルKAIROX配送エリアデータ ───
const MUNI_HEAT: Record<string, { level: number; en: string; ja: string; note: string }> = {
  // 千葉県
  "12213": { level: 5, en: "Narita",     ja: "成田市",   note: "KAIROX HQ ✈" },
  "12100": { level: 5, en: "Chiba City", ja: "千葉市",   note: "Main base" },
  "12218": { level: 4, en: "Narashino", ja: "習志野市",  note: "Makuhari area" },
  "12203": { level: 4, en: "Ichikawa",  ja: "市川市",   note: "Key corridor" },
  "12207": { level: 4, en: "Funabashi", ja: "船橋市",   note: "Key corridor" },
  "12227": { level: 3, en: "Urayasu",   ja: "浦安市",   note: "Disney/Tokyo Bay" },
  "12204": { level: 3, en: "Matsudo",   ja: "松戸市",   note: "Corridor" },
  "12217": { level: 3, en: "Yachiyo",   ja: "八千代市",  note: "Coverage area" },
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
};

const COLORS = [
  "rgba(30,41,59,0.4)",    // 0 — no data
  "rgba(59,130,246,0.35)", // 1 — low
  "rgba(37,99,235,0.5)",   // 2
  "rgba(249,115,22,0.55)", // 3
  "rgba(239,68,68,0.7)",   // 4
  "rgba(220,38,38,0.9)",   // 5 — highest
];
const STROKE = [
  "#334155", "#93c5fd", "#60a5fa", "#fb923c", "#f87171", "#fca5a5",
];

type TooltipState = { x: number; y: number; code: string; isMuni?: boolean } | null;

function project(
  [lng, lat]: [number, number],
  bbox: [number, number, number, number],
  w: number,
  h: number
): [number, number] {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const latRad = (lat * Math.PI) / 180;
  const minLatRad = (minLat * Math.PI) / 180;
  const maxLatRad = (maxLat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const mercMin = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
  const mercMax = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));
  const y = h - ((mercY - mercMin) / (mercMax - mercMin)) * h;
  return [x, y];
}

function ringToPath(
  ring: [number, number][],
  bbox: [number, number, number, number],
  w: number,
  h: number
): string {
  return ring
    .map((coord, i) => {
      const [x, y] = project(coord, bbox, w, h);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

function featureToPaths(
  geometry: { type: string; coordinates: unknown },
  bbox: [number, number, number, number],
  w: number,
  h: number
): string[] {
  const paths: string[] = [];
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as [number, number][][];
    paths.push(ringToPath(coords[0], bbox, w, h));
  } else if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as [number, number][][][];
    for (const poly of coords) {
      paths.push(ringToPath(poly[0], bbox, w, h));
    }
  }
  return paths;
}

const BBOX: [number, number, number, number] = [122.5, 24.0, 146.5, 46.0];
const W = 600;
const H = 620;

// Drill-down bounding boxes
const BBOX_CHIBA: [number, number, number, number] = [139.7, 35.0, 141.0, 36.0];
const BBOX_TOKYO: [number, number, number, number] = [139.5, 35.5, 140.0, 35.85];

const DRILLABLE = new Set(["12", "13"]);

export default function JapanHeatMap({ locale = "en" }: { locale?: string }) {
  const [paths, setPaths] = useState<
    { code: string; d: string; level: number }[]
  >([]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [drillPref, setDrillPref] = useState<string | null>(null);
  const [muniPaths, setMuniPaths] = useState<
    { code: string; name: string; d: string; level: number }[]
  >([]);
  const [muniLoading, setMuniLoading] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load prefecture data
  useEffect(() => {
    (async () => {
      const res = await fetch(
        "https://raw.githubusercontent.com/digital-go-jp/policy-dashboard-assets/main/data/map/ja_prefecture_area.json"
      );
      const topo = (await res.json()) as Topology;
      const objKey = Object.keys(topo.objects)[0];
      const geojson = topojson.feature(
        topo,
        topo.objects[objKey] as GeometryCollection
      ) as { type: string; features: { properties: Record<string, string>; geometry: { type: string; coordinates: unknown } }[] };

      const result: { code: string; d: string; level: number }[] = [];
      for (const feat of geojson.features) {
        const code = feat.properties.prefecture_code ?? feat.properties.id ?? "00";
        const level = HEAT[code]?.level ?? 0;
        const dPaths = featureToPaths(feat.geometry, BBOX, W, H);
        for (const d of dPaths) {
          result.push({ code, d, level });
        }
      }
      setPaths(result);
    })();
  }, []);

  // Load municipality data for drill-down
  const loadMunicipality = useCallback(async (prefCode: string) => {
    setMuniLoading(true);
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/digital-go-jp/policy-dashboard-assets/main/data/map/ja_municipality_area.json"
      );
      const topo = (await res.json()) as Topology;
      const objKey = Object.keys(topo.objects)[0];
      const geojson = topojson.feature(
        topo,
        topo.objects[objKey] as GeometryCollection
      ) as {
        type: string;
        features: {
          properties: Record<string, string>;
          geometry: { type: string; coordinates: unknown };
        }[];
      };

      const drillBbox = prefCode === "12" ? BBOX_CHIBA : BBOX_TOKYO;
      const result: { code: string; name: string; d: string; level: number }[] = [];

      for (const feat of geojson.features) {
        const p = feat.properties;
        const pref = p.prefecture_code ?? p.prefCode ?? p.N03_001 ?? "";
        if (!pref.startsWith(prefCode === "12" ? "12" : "13") && pref !== prefCode) continue;

        const cityCode =
          p.city_code ?? p.cityCode ?? p.N03_007 ??
          (p.prefecture_code ? p.prefecture_code + (p.city_code_suffix ?? "") : "00000");
        const name = p.city_name ?? p.cityName ?? p.N03_004 ?? p.name ?? "";

        // Normalize city code to 5 digits
        const normalizedCode = cityCode.replace(/-/g, "").padStart(5, "0").slice(0, 5);
        const level = MUNI_HEAT[normalizedCode]?.level ?? 1;

        const dPaths = featureToPaths(feat.geometry, drillBbox, W, H);
        for (const d of dPaths) {
          result.push({ code: normalizedCode, name, d, level });
        }
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
      ? (() => {
          const m = MUNI_HEAT[tooltip.code];
          if (!m) return null;
          return { name: locale === "ja" ? m.ja : m.en, sub: m.note, level: m.level };
        })()
      : (() => {
          const h = HEAT[tooltip.code];
          if (!h) return null;
          return { name: locale === "ja" ? h.ja : h.en, sub: h.count, level: h.level };
        })()
    : null;

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* 凡例 */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>Low demand</span>
        {[1, 2, 3, 4, 5].map((l) => (
          <span
            key={l}
            className="w-4 h-4 rounded-sm inline-block border"
            style={{ background: COLORS[l], borderColor: STROKE[l] }}
          />
        ))}
        <span>High demand</span>
        <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold"
          style={{ background: COLORS[5], borderColor: STROKE[5], border: "1px solid" }}>
          KAIROX
        </span>
      </div>

      {/* ドリルダウン状態表示 */}
      {drillPref && (
        <div className="flex items-center gap-3 w-full max-w-lg">
          <button
            onClick={() => { setDrillPref(null); setMuniPaths([]); setTooltip(null); }}
            className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1"
          >
            ← Japan
          </button>
          <span className="text-sm font-bold text-white">
            {drillPref === "12" ? "千葉県 — KAIROX配送エリア" : "東京都 — 配送カバレッジ"}
          </span>
          <span className="text-xs text-slate-400">
            Source: デジタル庁 行政区域データ
          </span>
        </div>
      )}

      {/* SVGマップ */}
      <div className="relative w-full max-w-lg">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          style={{ background: "rgba(15,23,42,0.6)", borderRadius: 12 }}
        >
          {/* 全国都道府県ビュー */}
          {!drillPref && (
            <>
              {paths.length === 0 && (
                <text x={W / 2} y={H / 2} textAnchor="middle" fill="#64748b" fontSize={16}>
                  Loading map…
                </text>
              )}
              {paths.map(({ code, d, level }, i) => (
                <path
                  key={`${code}-${i}`}
                  d={d}
                  fill={COLORS[level]}
                  stroke={STROKE[level]}
                  strokeWidth={level >= 4 ? 1.2 : 0.6}
                  className={`transition-all duration-200 ${DRILLABLE.has(code) ? "cursor-zoom-in" : "cursor-default"} hover:opacity-90`}
                  onMouseEnter={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, code });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePrefClick(code)}
                />
              ))}
              {/* 千葉・東京にズームアイコン */}
              {paths.length > 0 && (() => {
                const chibaPath = paths.find(p => p.code === "12");
                const tokyoPath = paths.find(p => p.code === "13");
                if (!chibaPath && !tokyoPath) return null;
                // Show a small label on Chiba
                const [cx, cy] = project([140.1, 35.6], BBOX, W, H);
                const [tx, ty] = project([139.7, 35.7], BBOX, W, H);
                return (
                  <g>
                    <text x={cx} y={cy} fill="white" fontSize={8} textAnchor="middle" style={{ pointerEvents: "none" }}>🔍</text>
                    <text x={tx} y={ty} fill="white" fontSize={8} textAnchor="middle" style={{ pointerEvents: "none" }}>🔍</text>
                  </g>
                );
              })()}
              {/* 成田アイコン */}
              {paths.length > 0 && (() => {
                const [nx, ny] = project([140.39, 35.76], BBOX, W, H);
                return (
                  <g>
                    <circle cx={nx} cy={ny} r={8} fill="#ef4444" opacity={0.9} />
                    <circle cx={nx} cy={ny} r={14} fill="#ef4444" opacity={0.3}>
                      <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={nx + 12} y={ny + 4} fill="white" fontSize={10} fontWeight="bold">✈ Narita</text>
                  </g>
                );
              })()}
            </>
          )}

          {/* 市区町村ドリルダウンビュー */}
          {drillPref && (
            <>
              {muniLoading && (
                <text x={W / 2} y={H / 2} textAnchor="middle" fill="#64748b" fontSize={16}>
                  Loading municipalities…
                </text>
              )}
              {muniPaths.map(({ code, name, d, level }, i) => (
                <path
                  key={`muni-${code}-${i}`}
                  d={d}
                  fill={COLORS[level]}
                  stroke={STROKE[level]}
                  strokeWidth={MUNI_HEAT[code] ? 1.5 : 0.5}
                  className="transition-all duration-200 cursor-pointer hover:opacity-80"
                  onMouseEnter={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, code, isMuni: true });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
              {/* KAIROXエリアラベル */}
              {!muniLoading && drillPref === "12" && (() => {
                const [nx, ny] = project([140.39, 35.76], BBOX_CHIBA, W, H);
                return (
                  <g>
                    <circle cx={nx} cy={ny} r={10} fill="#ef4444" opacity={0.9} />
                    <circle cx={nx} cy={ny} r={16} fill="#ef4444" opacity={0.3}>
                      <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={nx + 14} y={ny + 4} fill="white" fontSize={11} fontWeight="bold">✈ Narita HQ</text>
                  </g>
                );
              })()}
            </>
          )}
        </svg>

        {/* ツールチップ */}
        {tooltip && heatItem && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg text-sm shadow-xl"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 40,
              background: "rgba(15,23,42,0.95)",
              border: `1px solid ${STROKE[heatItem.level]}`,
              color: "white",
              minWidth: 140,
            }}
          >
            <div className="font-bold">{heatItem.name}</div>
            <div className="text-xs mt-0.5" style={{ color: STROKE[heatItem.level] }}>
              {heatItem.sub}
            </div>
            {!tooltip.isMuni && DRILLABLE.has(tooltip.code) && (
              <div className="text-[10px] mt-1 text-slate-400">🔍 Click to zoom</div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Data: JNTO 2024年訪日外客統計 × 国土交通省 行政区域データ（CC BY 4.0）via デジタル庁
      </p>
    </div>
  );
}
