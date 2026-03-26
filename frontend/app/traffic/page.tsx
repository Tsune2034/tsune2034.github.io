"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import type { CongestionPoint } from "../api/traffic/route";

// ─── 型宣言 ───────────────────────────────────────────────
declare global {
  interface Window {
    google: typeof google;
    initKairoxMap: () => void;
  }
}

// ─── 定数 ─────────────────────────────────────────────────
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

const CONGESTION_COLOR: Record<string, string> = {
  jam:   "#ef4444",
  slow:  "#f59e0b",
  clear: "#22c55e",
};

// ─── 翻訳 ─────────────────────────────────────────────────
const TR = {
  ja: {
    subtitle:      "成田・羽田 空港ルート リアルタイム渋滞情報",
    updated:       "更新",
    jam: "渋滞", slow: "混雑", clear: "順調",
    collecting:    "Googleトラフィックを表示中 — KAIROXデータ収集中",
    loading:       "マップを読み込み中...",
    legend_jam:    "渋滞 <10km/h",
    legend_slow:   "混雑 <25km/h",
    legend_clear:  "順調 25km/h+",
    legend_airport:"空港",
    routes_title:  "主要ルート状況",
    route_highway: "🛣️ 高速道路",
    route_local:   "🏘️ 一般道",
    unknown:       "データ収集中",
    cta_title:     "荷物を持たずに移動しませんか？",
    cta_sub:       "成田・羽田発 — ホテルまで先に届けます",
    cta_btn:       "無料で予約 →",
    seo1_title:    "成田空港の渋滞について",
    seo1_body:     "成田空港から都心へのアクセスは主に東関東自動車道・京葉道路・国道51号の3ルートがあります。平日朝8〜10時・夕方17〜20時は慢性的な渋滞が発生しやすく、特に東関東道の千葉北IC〜宮野木JCT間は渋滞の名所です。週末・連休前後は全ルートで混雑が激化し、成田空港ICから都心まで通常の2〜3倍の時間がかかることがあります。",
    seo2_title:    "羽田空港の渋滞について",
    seo2_body:     "羽田空港から都心へは首都高速湾岸線・1号羽田線が主なルートです。平日朝は羽田空港IC〜浜崎橋JCT間で慢性的な渋滞が発生します。国際線ターミナル（T3）からは空港連絡バスや都心直行バスも選択肢ですが、朝夕のラッシュ時は道路渋滞の影響を受けます。本マップでは羽田〜成田間の連絡ルートも監視しています。",
    seo3_title:    "渋滞を避けるには",
    seo3_body:     "空港から宿泊先へ大きな荷物を持って移動する場合、渋滞は特に負担になります。KAIROXの手ぶら配送サービスを使えば、荷物をそのままホテルへ先送りできるため、混雑した電車やバスでも身軽に移動できます。成田空港・羽田空港対応。カウンター不要・締め切りなし。",
    footer_data:   "データ提供: KAIROX 実配送GPS + Google Traffic",
    footer_copy:   "© 2026 KAIROX — Japan Luggage Freedom",
    routes: [
      "成田空港 → 都心（東関東道）",
      "成田空港 → 千葉市（国道357）",
      "羽田空港 → 都心（首都高）",
      "成田 ↔ 羽田（空港連絡）",
    ],
  },
  en: {
    subtitle:      "Narita & Haneda Airport Route — Live Traffic",
    updated:       "Updated",
    jam: "Jam", slow: "Slow", clear: "Clear",
    collecting:    "Showing Google Traffic — KAIROX data collecting",
    loading:       "Loading map...",
    legend_jam:    "Jam <10km/h",
    legend_slow:   "Slow <25km/h",
    legend_clear:  "Clear 25km/h+",
    legend_airport:"Airport",
    routes_title:  "Major Route Status",
    route_highway: "🛣️ Highway",
    route_local:   "🏘️ Local Road",
    unknown:       "Collecting data",
    cta_title:     "Travel hands-free from the airport",
    cta_sub:       "Narita & Haneda — We deliver your luggage to the hotel first",
    cta_btn:       "Book for free →",
    seo1_title:    "Traffic around Narita Airport",
    seo1_body:     "The main routes from Narita Airport to central Tokyo are the Higashi-Kanto Expressway, Keiyo Road, and National Route 51. Chronic congestion occurs on weekday mornings (8–10am) and evenings (5–8pm), especially between Chiba-Kita IC and Miyano-ki JCT on the Higashi-Kanto Expressway. On weekends and holidays, all routes experience heavy traffic, sometimes 2–3× the normal travel time.",
    seo2_title:    "Traffic around Haneda Airport",
    seo2_body:     "The main routes from Haneda Airport to central Tokyo are the Bayshore Route and Shuto No.1 Haneda Line. Chronic morning congestion occurs between Haneda IC and Hamazakibashi JCT. Airport buses to central Tokyo are also an option but are subject to road congestion during rush hours. This map also monitors the Haneda–Narita inter-airport route.",
    seo3_title:    "How to avoid traffic",
    seo3_body:     "Carrying heavy luggage through congested roads and trains is exhausting. With KAIROX luggage delivery, your bags are sent directly to your hotel so you can travel light — even on crowded trains and buses. Available at Narita and Haneda airports. No counters, no deadlines.",
    footer_data:   "Data: KAIROX GPS + Google Traffic",
    footer_copy:   "© 2026 KAIROX — Japan Luggage Freedom",
    routes: [
      "Narita → Central Tokyo (Higashi-Kanto Expwy)",
      "Narita → Chiba City (Rt.357)",
      "Haneda → Central Tokyo (Shuto Expwy)",
      "Narita ↔ Haneda (Airport Express)",
    ],
  },
  zh: {
    subtitle:      "成田・羽田机场路线 — 实时交通状况",
    updated:       "更新",
    jam: "拥堵", slow: "缓行", clear: "畅通",
    collecting:    "显示谷歌交通 — KAIROX数据收集中",
    loading:       "地图加载中...",
    legend_jam:    "拥堵 <10km/h",
    legend_slow:   "缓行 <25km/h",
    legend_clear:  "畅通 25km/h+",
    legend_airport:"机场",
    routes_title:  "主要路线状况",
    route_highway: "🛣️ 高速公路",
    route_local:   "🏘️ 普通道路",
    unknown:       "数据收集中",
    cta_title:     "无需携带行李出行",
    cta_sub:       "成田・羽田出发 — 行李直送酒店",
    cta_btn:       "免费预约 →",
    seo1_title:    "成田机场附近的交通状况",
    seo1_body:     "从成田机场前往东京市中心，主要路线有东关东自动车道、京叶道路和国道51号。工作日早上8-10点和傍晚17-20点容易出现慢性堵车，尤其是东关东道千叶北IC到宫野木JCT路段。周末和节假日前后，所有路线拥堵加剧，从成田机场IC到市中心有时需要平时2-3倍的时间。",
    seo2_title:    "羽田机场附近的交通状况",
    seo2_body:     "从羽田机场前往东京市中心，主要路线是首都高速湾岸线和1号羽田线。工作日早上羽田机场IC到浜崎桥JCT之间经常堵车。从国际航站楼（T3）也可乘坐机场巴士，但早晚高峰期会受道路拥堵影响。本地图还监控羽田-成田机场间的联络路线。",
    seo3_title:    "如何避开交通拥堵",
    seo3_body:     "拎着大行李在拥堵的道路和电车上穿行非常辛苦。使用KAIROX行李配送服务，您的行李将直接送到酒店，让您轻装出行——即使在拥挤的电车和巴士上也不成问题。支持成田和羽田机场。无需柜台，无截止时间。",
    footer_data:   "数据来源：KAIROX 实配送GPS + 谷歌交通",
    footer_copy:   "© 2026 KAIROX — Japan Luggage Freedom",
    routes: [
      "成田 → 东京市中心（东关东道）",
      "成田 → 千叶市（国道357）",
      "羽田 → 东京市中心（首都高）",
      "成田 ↔ 羽田（机场联络）",
    ],
  },
  ko: {
    subtitle:      "나리타・하네다 공항 노선 — 실시간 교통정보",
    updated:       "업데이트",
    jam: "정체", slow: "혼잡", clear: "원활",
    collecting:    "구글 트래픽 표시 중 — KAIROX 데이터 수집 중",
    loading:       "지도 로딩 중...",
    legend_jam:    "정체 <10km/h",
    legend_slow:   "혼잡 <25km/h",
    legend_clear:  "원활 25km/h+",
    legend_airport:"공항",
    routes_title:  "주요 노선 상황",
    route_highway: "🛣️ 고속도로",
    route_local:   "🏘️ 일반도로",
    unknown:       "데이터 수집 중",
    cta_title:     "짐 없이 자유롭게 이동하세요",
    cta_sub:       "나리타・하네다 출발 — 짐을 호텔로 먼저 배송",
    cta_btn:       "무료 예약 →",
    seo1_title:    "나리타 공항 교통 상황",
    seo1_body:     "나리타 공항에서 도심까지의 주요 경로는 히가시칸토 고속도로, 케이요 도로, 국도 51호의 3가지입니다. 평일 오전 8~10시와 오후 5~8시에 만성적인 정체가 발생하기 쉬우며, 특히 히가시칸토 고속도로의 치바키타 IC~미야노키 JCT 구간이 정체 명소입니다. 주말과 연휴 전후에는 모든 경로에서 혼잡이 심해져 나리타 공항 IC에서 도심까지 평소의 2~3배 시간이 걸릴 수 있습니다.",
    seo2_title:    "하네다 공항 교통 상황",
    seo2_body:     "하네다 공항에서 도심까지는 수도고속 만간선・1호 하네다선이 주요 경로입니다. 평일 아침에는 하네다 공항 IC~하마사키바시 JCT 구간에서 만성적인 정체가 발생합니다. 국제선 터미널（T3）에서는 공항 버스도 이용 가능하지만 러시아워에는 도로 정체의 영향을 받습니다. 이 지도에서는 하네다~나리타 간 연락 노선도 모니터링합니다.",
    seo3_title:    "교통 정체를 피하려면",
    seo3_body:     "무거운 짐을 들고 혼잡한 도로와 전철을 이용하는 것은 매우 힘든 일입니다. KAIROX 짐 배송 서비스를 이용하면 짐을 호텔로 먼저 보낼 수 있어 혼잡한 전철과 버스에서도 가볍게 이동할 수 있습니다. 나리타 공항・하네다 공항 대응. 카운터 불필요・마감 없음.",
    footer_data:   "데이터 제공: KAIROX 실배송 GPS + 구글 트래픽",
    footer_copy:   "© 2026 KAIROX — Japan Luggage Freedom",
    routes: [
      "나리타 → 도심（히가시칸토 고속）",
      "나리타 → 치바시（국도357）",
      "하네다 → 도심（수도고속）",
      "나리타 ↔ 하네다（공항 연결）",
    ],
  },
} as const;
type Locale = keyof typeof TR;

const LEVEL_LABEL: Record<string, { ja: string; en: string }> = {
  jam:   { ja: "渋滞",  en: "Traffic Jam"  },
  slow:  { ja: "混雑",  en: "Slow"         },
  clear: { ja: "順調",  en: "Clear"        },
};

// ─── 成田・羽田 主要ルートのウェイポイント（データ0件時のデフォルト表示用）
const DEFAULT_MARKERS = [
  { lat: 35.7647, lng: 140.3864, label: "成田空港", icon: "✈️" },
  { lat: 35.5494, lng: 139.7798, label: "羽田空港", icon: "✈️" },
  { lat: 35.6895, lng: 139.6917, label: "東京都心",  icon: "🏙️" },
  { lat: 35.4437, lng: 139.6380, label: "横浜",      icon: "🏙️" },
];

// ─── Dark Map スタイル ─────────────────────────────────────
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",        stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c6bc4" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

// ─── メインコンポーネント ──────────────────────────────────
export default function TrafficPage() {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const circles     = useRef<google.maps.Circle[]>([]);

  const [points,      setPoints]      = useState<CongestionPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [mapReady,    setMapReady]    = useState(false);
  const [locale,      setLocale]      = useState<Locale>("ja");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang") ?? navigator.language.slice(0, 2);
    if (lang === "en") setLocale("en");
    else if (lang === "zh") setLocale("zh");
    else if (lang === "ko") setLocale("ko");
    else setLocale("ja");
  }, []);

  const tr = TR[locale];

  // ─── 渋滞データ取得 ─────────────────────────────────────
  const fetchTraffic = useCallback(async () => {
    try {
      const hour = new Date().getHours();
      const res  = await fetch(`/api/traffic?hour=${hour}`);
      if (res.ok) {
        setPoints(await res.json());
        setLastUpdated(new Date());
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTraffic();
    const iv = setInterval(fetchTraffic, 60_000);
    return () => clearInterval(iv);
  }, [fetchTraffic]);

  // ─── マップ初期化 ────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center:    { lat: 35.66, lng: 140.10 },
      zoom:      9,
      styles:    DARK_STYLE,
      mapTypeControl:    false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    new window.google.maps.TrafficLayer().setMap(map);

    // 主要空港マーカー
    DEFAULT_MARKERS.forEach((m) => {
      new window.google.maps.Marker({
        map,
        position: { lat: m.lat, lng: m.lng },
        title:    m.label,
        icon: {
          path:        window.google.maps.SymbolPath.CIRCLE,
          scale:       8,
          fillColor:   "#f59e0b",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    });

    mapInstance.current = map;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (scriptReady) initMap();
  }, [scriptReady, initMap]);

  // ─── 渋滞サークルを更新 ──────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !window.google) return;
    circles.current.forEach((c) => c.setMap(null));
    circles.current = [];

    points.forEach((p) => {
      const color = CONGESTION_COLOR[p.congestion_level] ?? "#6b7280";
      const circle = new window.google.maps.Circle({
        map:           mapInstance.current!,
        center:        { lat: p.lat, lng: p.lng },
        radius:        4000,
        fillColor:     color,
        fillOpacity:   0.35,
        strokeColor:   color,
        strokeOpacity: 0.7,
        strokeWeight:  1.5,
      });
      circles.current.push(circle);

      // クリックで詳細表示
      circle.addListener("click", () => {
        new window.google.maps.InfoWindow({
          content: `<div style="background:#1e293b;color:#e2e8f0;padding:8px;border-radius:8px;font-size:12px">
            <b>${LEVEL_LABEL[p.congestion_level]?.ja ?? p.congestion_level}</b><br>
            平均速度: ${p.avg_speed_kmh} km/h<br>
            ${p.route_type === "highway" ? "🛣️ 高速道路" : "🏘️ 一般道"}<br>
            サンプル: ${p.sample_count}件
          </div>`,
          position: { lat: p.lat, lng: p.lng },
        }).open(mapInstance.current!);
      });
    });
  }, [points, mapReady]);

  // ─── 統計サマリー ─────────────────────────────────────────
  const jamCount   = points.filter((p) => p.congestion_level === "jam").length;
  const slowCount  = points.filter((p) => p.congestion_level === "slow").length;
  const clearCount = points.filter((p) => p.congestion_level === "clear").length;

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&language=${locale}`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />

      <div className="min-h-screen bg-gray-950 text-white">

        {/* ─── ヘッダー ─── */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-800">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-amber-400">KAIROX</span>
                  <span className="text-lg font-bold text-white">Traffic</span>
                  <span className="text-[10px] bg-red-500/20 border border-red-500/50 text-red-400 px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">{tr.subtitle}</p>
              </div>
              {lastUpdated && (
                <button
                  type="button"
                  onClick={fetchTraffic}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors text-right"
                >
                  {tr.updated} {lastUpdated.toLocaleTimeString(locale === "ja" ? "ja-JP" : locale === "ko" ? "ko-KR" : locale === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 統計バッジ ─── */}
        <div className="px-4 py-2 border-b border-gray-800/50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {[
              { level: "jam",   count: jamCount,   label: tr.jam,   bg: "bg-red-500/15 border-red-500/40 text-red-400" },
              { level: "slow",  count: slowCount,  label: tr.slow,  bg: "bg-amber-500/15 border-amber-500/40 text-amber-400" },
              { level: "clear", count: clearCount, label: tr.clear, bg: "bg-green-500/15 border-green-500/40 text-green-400" },
            ].map(({ level, count, label, bg }) => (
              <div key={level} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${bg}`}>
                <span>{count}</span>
                <span>{label}</span>
              </div>
            ))}
            {points.length === 0 && (
              <span className="text-[11px] text-gray-600">{tr.collecting}</span>
            )}
          </div>
        </div>

        {/* ─── マップ ─── */}
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full"
            style={{ height: "58vh", background: "#1a1a2e" }}
          />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500">{tr.loading}</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── 凡例 ─── */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {[
                { color: "bg-red-500",   label: tr.legend_jam   },
                { color: "bg-amber-500", label: tr.legend_slow  },
                { color: "bg-green-500", label: tr.legend_clear },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] text-gray-600">{tr.legend_airport}</span>
            </div>
          </div>
        </div>

        {/* ─── AdSense 枠 ─── */}
        {/* TODO: Google AdSense 審査通過後に以下のコメントを解除
        <div className="px-4 py-2">
          <div className="max-w-2xl mx-auto">
            <ins className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client="ca-pub-XXXXXXXXXX"
              data-ad-slot="XXXXXXXXXX"
              data-ad-format="auto"
              data-full-width-responsive="true" />
          </div>
        </div>
        */}
        <div className="px-4 py-2">
          <div className="max-w-2xl mx-auto">
            <div className="h-16 rounded-xl border border-dashed border-gray-800 flex items-center justify-center">
              <span className="text-[10px] text-gray-700">広告枠（AdSense設置予定）</span>
            </div>
          </div>
        </div>

        {/* ─── ルート別ステータスカード ─── */}
        <div className="px-4 py-3">
          <div className="max-w-2xl mx-auto space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{tr.routes_title}</p>
            {[
              { route: tr.routes[0], type: "highway" },
              { route: tr.routes[1], type: "local"   },
              { route: tr.routes[2], type: "highway" },
              { route: tr.routes[3], type: "highway" },
            ].map(({ route, type }) => {
              const relevant = points.filter((p) => p.route_type === type);
              const hasJam   = relevant.some((p) => p.congestion_level === "jam");
              const hasSlow  = relevant.some((p) => p.congestion_level === "slow");
              const level    = relevant.length === 0 ? "unknown" : hasJam ? "jam" : hasSlow ? "slow" : "clear";
              const badge    = level === "jam"   ? "bg-red-500/20 border-red-500/50 text-red-400" :
                               level === "slow"  ? "bg-amber-500/20 border-amber-500/50 text-amber-400" :
                               level === "clear" ? "bg-green-500/20 border-green-500/50 text-green-400" :
                                                   "bg-gray-800/50 border-gray-700 text-gray-500";
              const levelLabels: Record<string, string> = { jam: tr.jam, slow: tr.slow, clear: tr.clear };
              const labelText = level === "unknown" ? tr.unknown : levelLabels[level] ?? level;
              return (
                <div key={route} className="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{route}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{type === "highway" ? tr.route_highway : tr.route_local}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge}`}>
                    {labelText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 詳細ページリンク ─── */}
        <div className="px-4 pt-2">
          <div className="max-w-2xl mx-auto grid grid-cols-2 gap-2">
            <a href="/traffic/narita" className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-3 hover:border-amber-500/40 transition-colors">
              <p className="text-xs font-bold text-gray-200">✈️ 成田空港</p>
              <p className="text-[10px] text-gray-600 mt-0.5">東関東道・国道51号 詳細 →</p>
            </a>
            <a href="/traffic/haneda" className="bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-3 hover:border-amber-500/40 transition-colors">
              <p className="text-xs font-bold text-gray-200">✈️ 羽田空港</p>
              <p className="text-[10px] text-gray-600 mt-0.5">首都高・湾岸線 詳細 →</p>
            </a>
          </div>
        </div>

        {/* ─── CTA：手ぶら配送 ─── */}
        <div className="px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-400">{tr.cta_title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{tr.cta_sub}</p>
              </div>
              <a
                href="/narita"
                className="shrink-0 bg-amber-500 text-gray-950 font-black text-xs px-4 py-2.5 rounded-xl hover:bg-amber-400 transition-colors"
              >
                {tr.cta_btn}
              </a>
            </div>
          </div>
        </div>

        {/* ─── SEO コンテンツ ─── */}
        <div className="px-4 py-4 border-t border-gray-800/50">
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{tr.seo1_title}</h2>
              <p className="text-[11px] text-gray-600 leading-relaxed">{tr.seo1_body}</p>
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{tr.seo2_title}</h2>
              <p className="text-[11px] text-gray-600 leading-relaxed">{tr.seo2_body}</p>
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{tr.seo3_title}</h2>
              <p className="text-[11px] text-gray-600 leading-relaxed">{tr.seo3_body}</p>
            </div>
          </div>
        </div>

        {/* ─── フッター ─── */}
        <div className="px-4 py-5 border-t border-gray-800 mt-2">
          <div className="max-w-2xl mx-auto text-center space-y-1">
            <p className="text-[11px] text-gray-600">{tr.footer_data}</p>
            <p className="text-[10px] text-gray-700">{tr.footer_copy}</p>
          </div>
        </div>

      </div>
    </>
  );
}
