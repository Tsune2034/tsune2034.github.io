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
        src={`https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&language=ja`}
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
                <p className="text-[11px] text-gray-500 mt-0.5">成田・羽田 空港ルート リアルタイム渋滞情報</p>
              </div>
              {lastUpdated && (
                <button
                  type="button"
                  onClick={fetchTraffic}
                  className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors text-right"
                >
                  更新 {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 統計バッジ ─── */}
        <div className="px-4 py-2 border-b border-gray-800/50">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {[
              { level: "jam",   count: jamCount,   label: "渋滞",  bg: "bg-red-500/15 border-red-500/40 text-red-400" },
              { level: "slow",  count: slowCount,  label: "混雑",  bg: "bg-amber-500/15 border-amber-500/40 text-amber-400" },
              { level: "clear", count: clearCount, label: "順調",  bg: "bg-green-500/15 border-green-500/40 text-green-400" },
            ].map(({ level, count, label, bg }) => (
              <div key={level} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${bg}`}>
                <span>{count}</span>
                <span>{label}</span>
              </div>
            ))}
            {points.length === 0 && (
              <span className="text-[11px] text-gray-600">Googleトラフィックを表示中 — KAIROXデータ収集中</span>
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
                <p className="text-xs text-gray-500">マップを読み込み中...</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── 凡例 ─── */}
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {[
                { color: "bg-red-500",   label: "渋滞 <10km/h" },
                { color: "bg-amber-500", label: "混雑 <25km/h" },
                { color: "bg-green-500", label: "順調 25km/h+" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] text-gray-600">空港</span>
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
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">主要ルート状況</p>
            {[
              { route: "成田空港 → 都心（東関東道）", type: "highway", from: { lat: 35.7647, lng: 140.3864 }, to: { lat: 35.6895, lng: 139.6917 } },
              { route: "成田空港 → 千葉市（国道357）", type: "local",   from: { lat: 35.7647, lng: 140.3864 }, to: { lat: 35.6073, lng: 140.1063 } },
              { route: "羽田空港 → 都心（首都高）",   type: "highway", from: { lat: 35.5494, lng: 139.7798 }, to: { lat: 35.6895, lng: 139.6917 } },
              { route: "成田 ↔ 羽田（空港連絡）",    type: "highway", from: { lat: 35.7647, lng: 140.3864 }, to: { lat: 35.5494, lng: 139.7798 } },
            ].map(({ route, type }) => {
              const relevant = points.filter((p) => p.route_type === type);
              const hasJam   = relevant.some((p) => p.congestion_level === "jam");
              const hasSlow  = relevant.some((p) => p.congestion_level === "slow");
              const level    = relevant.length === 0 ? "unknown" : hasJam ? "jam" : hasSlow ? "slow" : "clear";
              const badge    = level === "jam"   ? "bg-red-500/20 border-red-500/50 text-red-400" :
                               level === "slow"  ? "bg-amber-500/20 border-amber-500/50 text-amber-400" :
                               level === "clear" ? "bg-green-500/20 border-green-500/50 text-green-400" :
                                                   "bg-gray-800/50 border-gray-700 text-gray-500";
              const labelText = level === "unknown" ? "データ収集中" : LEVEL_LABEL[level]?.ja ?? level;
              return (
                <div key={route} className="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{route}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{type === "highway" ? "🛣️ 高速道路" : "🏘️ 一般道"}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge}`}>
                    {labelText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── CTA：手ぶら配送 ─── */}
        <div className="px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-amber-400">荷物を持たずに移動しませんか？</p>
                <p className="text-[11px] text-gray-500 mt-0.5">成田・羽田発 — ホテルまで先に届けます</p>
              </div>
              <a
                href="/narita"
                className="shrink-0 bg-amber-500 text-gray-950 font-black text-xs px-4 py-2.5 rounded-xl hover:bg-amber-400 transition-colors"
              >
                無料で予約 →
              </a>
            </div>
          </div>
        </div>

        {/* ─── SEO コンテンツ ─── */}
        <div className="px-4 py-4 border-t border-gray-800/50">
          <div className="max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">成田空港の渋滞について</h2>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                成田空港から都心へのアクセスは主に東関東自動車道・京葉道路・国道51号の3ルートがあります。
                平日朝8〜10時・夕方17〜20時は慢性的な渋滞が発生しやすく、特に東関東道の千葉北IC〜宮野木JCT間は渋滞の名所です。
                週末・連休前後は全ルートで混雑が激化し、成田空港ICから都心まで通常の2〜3倍の時間がかかることがあります。
                KAIROXの実配送データによる渋滞情報は、一般的な交通情報と組み合わせてご活用ください。
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">羽田空港の渋滞について</h2>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                羽田空港から都心へは首都高速湾岸線・1号羽田線が主なルートです。
                平日朝は羽田空港IC〜浜崎橋JCT間で慢性的な渋滞が発生します。
                国際線ターミナル（T3）からは空港連絡バスや都心直行バスも選択肢ですが、朝夕のラッシュ時は道路渋滞の影響を受けます。
                本マップでは羽田〜成田間の連絡ルート（首都高・東関東道経由）も監視しています。
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">渋滞を避けるには</h2>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                空港から宿泊先へ大きな荷物を持って移動する場合、渋滞は特に負担になります。
                KAIROXの手ぶら配送サービスを使えば、荷物をそのままホテルへ先送りできるため、混雑した電車やバスでも身軽に移動できます。
                成田空港・羽田空港対応。カウンター不要・締め切りなし。
              </p>
            </div>
          </div>
        </div>

        {/* ─── フッター ─── */}
        <div className="px-4 py-5 border-t border-gray-800 mt-2">
          <div className="max-w-2xl mx-auto text-center space-y-1">
            <p className="text-[11px] text-gray-600">
              データ提供: KAIROX 実配送GPS + Google Traffic
            </p>
            <p className="text-[10px] text-gray-700">
              © 2026 KAIROX — Japan Luggage Freedom
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
