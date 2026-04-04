"use client";

import { useEffect, useRef, useState } from "react";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

// ─── インバウンド需要ヒートデータ（KAIROX配送エリア基準）───
const HEAT: Record<string, { level: number; en: string; ja: string; count: string }> = {
  "13": { level: 5, en: "Tokyo",     ja: "東京都",  count: "3.2M visits" },
  "12": { level: 5, en: "Chiba",     ja: "千葉県",  count: "KAIROX Main" },
  "14": { level: 4, en: "Kanagawa",  ja: "神奈川県", count: "1.8M visits" },
  "27": { level: 4, en: "Osaka",     ja: "大阪府",  count: "2.1M visits" },
  "26": { level: 3, en: "Kyoto",     ja: "京都府",  count: "1.4M visits" },
  "01": { level: 3, en: "Hokkaido",  ja: "北海道",  count: "0.9M visits" },
  "28": { level: 3, en: "Hyogo",     ja: "兵庫県",  count: "0.8M visits" },
  "23": { level: 2, en: "Aichi",     ja: "愛知県",  count: "0.6M visits" },
  "40": { level: 2, en: "Fukuoka",   ja: "福岡県",  count: "0.7M visits" },
  "47": { level: 2, en: "Okinawa",   ja: "沖縄県",  count: "0.5M visits" },
  "22": { level: 1, en: "Shizuoka",  ja: "静岡県",  count: "0.4M visits" },
  "11": { level: 1, en: "Saitama",   ja: "埼玉県",  count: "0.3M visits" },
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

type TooltipState = { x: number; y: number; code: string } | null;

// ─── Mercator projection（緯度経度 → SVG座標）───
function project(
  [lng, lat]: [number, number],
  bbox: [number, number, number, number],
  w: number,
  h: number
): [number, number] {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  // Mercator y
  const latRad = (lat * Math.PI) / 180;
  const minLatRad = (minLat * Math.PI) / 180;
  const maxLatRad = (maxLat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const mercMin = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
  const mercMax = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));
  const y = h - ((mercY - mercMin) / (mercMax - mercMin)) * h;
  return [x, y];
}

// ─── GeoJSON ring → SVG path string ───
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

// ─── 地物ごとのSVGパス生成 ───
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

// ─── JAPAN bounding box（本州・四国・九州・北海道のみ）───
const BBOX: [number, number, number, number] = [122.5, 24.0, 146.5, 46.0];
const W = 600;
const H = 620;

export default function JapanHeatMap({ locale = "en" }: { locale?: string }) {
  const [paths, setPaths] = useState<
    { code: string; d: string; level: number }[]
  >([]);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const heatItem = tooltip ? HEAT[tooltip.code] : null;

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

      {/* SVGマップ */}
      <div className="relative w-full max-w-lg">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          style={{ background: "rgba(15,23,42,0.6)", borderRadius: 12 }}
        >
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
              className="transition-all duration-200 cursor-pointer hover:opacity-90"
              onMouseEnter={(e) => {
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;
                setTooltip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  code,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
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
            <div className="font-bold">{locale === "ja" ? heatItem.ja : heatItem.en}</div>
            <div className="text-xs mt-0.5" style={{ color: STROKE[heatItem.level] }}>
              {heatItem.count}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Data: 国土交通省 行政区域データ（CC BY 4.0）via デジタル庁
      </p>
    </div>
  );
}
