"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import type { Translation } from "./i18n";
import type { FlightInfo } from "./api/flights/route";

// ───────────────────────── 定数 ─────────────────────────
const GPS_INTERVAL_MS = 30_000; // 30秒ごとに送信
const FLIGHT_REFRESH_NORMAL_MS = 600_000; // 10分（通常）
const FLIGHT_REFRESH_URGENT_MS  = 120_000; // 2分（監視中フライトが着陸20分前以内）
const NEARBY_THRESHOLD_M = 500; // 500m以内で「近くにいます」自動切替

// 成田空港 ターミナル座標
const NARITA_TERMINALS = [
  { name: "T1", lat: 35.7719, lng: 140.3928 },
  { name: "T2", lat: 35.7648, lng: 140.3863 },
];

// Haversine距離計算（メートル）
function calcDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 成田空港に最も近いターミナルまでの距離（m）
function distToNarita(lat: number, lng: number): number {
  return Math.min(...NARITA_TERMINALS.map((t) => calcDistanceM(lat, lng, t.lat, t.lng)));
}

type DriverStatus = "heading" | "nearby" | "arrived" | "done";

const STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; next?: DriverStatus }> = {
  heading: { label: "🚐 向かっています",   color: "bg-sky-500",   next: "nearby"  },
  nearby:  { label: "📍 近くにいます",      color: "bg-amber-500", next: "arrived" },
  arrived: { label: "📦 荷物を受け取り中", color: "bg-green-500", next: "done"    },
  done:    { label: "✅ 配達完了",          color: "bg-gray-600"                   },
};

type RouteType = "highway" | "local";

interface ActiveDelivery {
  bookingId: string;
  status: DriverStatus;
  gpsActive: boolean;
  routeType: RouteType;
  trackPoints: { lat: number; lng: number }[];
  sendCount: number;
  customsExited: boolean;
  customerMessage: string | null;
  customerMessageAt: string | null;
  heading: number | null; // GPS進行方向（度、北=0）
}

// お客から届くメッセージのラベル（ドライバー向け日本語表示）
const DRIVER_MSG_LABELS: Record<string, { icon: string; ja: string }> = {
  coming_out:   { icon: "🚶", ja: "もうすぐ出口に出ます" },
  red_bag:      { icon: "🧳", ja: "荷物は赤いスーツケースです" },
  wait_please:  { icon: "⏳", ja: "少し待ってください（5〜10分）" },
  where_driver: { icon: "📍", ja: "ドライバーはどこですか？" },
};

// ドライバーからお客へ送る定型メッセージ
const DRIVER_TO_CUSTOMER_MSGS = [
  { key: "coming_now", icon: "🚗", ja: "今着きました。出口でお待ちです" },
  { key: "delayed",    icon: "⏳", ja: "渋滞中です。あと約10分で到着します" },
  { key: "cant_find",  icon: "📞", ja: "お客様を確認できません。出口でお待ちです" },
] as const;

async function pushDriverMessage(bookingId: string, messageKey: string) {
  try {
    await fetch(`/api/driver-message?id=${encodeURIComponent(bookingId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_key: messageKey }),
    });
  } catch { /* ignore */ }
}

// ───────────────────────── GPS・ステータス送信 ─────────────────────────
async function pushLocation(bookingId: string, lat: number, lng: number,
                            driverStatus: string, routeType: string) {
  try {
    await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, driver_status: driverStatus, route_type: routeType }),
    });
  } catch {
    // GPS送信失敗は無視（次回リトライ）
  }
}

// ステータスのみ送信（GPS OFF時も必ず呼ぶ）
async function pushStatus(bookingId: string, driverStatus: string, routeType: string) {
  try {
    await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_status: driverStatus, route_type: routeType }),
    });
  } catch {
    // 失敗は無視
  }
}

// ───────────────────────── Flight Board ─────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function etaLabel(f: FlightInfo): { text: string; color: string; urgent: boolean } {
  if (f.status === "landed") return { text: "着陸済み", color: "text-green-400", urgent: true };
  const target = f.estimatedArrival ?? f.scheduledArrival;
  const diffMin = Math.round((new Date(target).getTime() - Date.now()) / 60_000);
  if (diffMin <= 0) return { text: "まもなく着陸", color: "text-amber-400", urgent: true };
  if (diffMin <= 20) return { text: `約${diffMin}分後`, color: "text-amber-300", urgent: true };
  return { text: `約${diffMin}分後`, color: "text-gray-400", urgent: false };
}

const CUSTOMS_WAIT_SEC = 45 * 60; // 平均入国審査+税関 45分

function FlightBoard({ watchedFlightIata, onWatch, onLanding }: {
  watchedFlightIata: string | null;
  onWatch: (iata: string | null) => void;
  onLanding?: (flightIata: string, terminal: string | null) => void;
}) {
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<FlightInfo | null | "notfound">(null);
  const [searching, setSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [landedAt, setLandedAt] = useState<Date | null>(null);
  const [customsRemainSec, setCustomsRemainSec] = useState(CUSTOMS_WAIT_SEC);

  const fetchArrivals = useCallback(async () => {
    try {
      const res = await fetch("/api/flights?airport=NRT&status=active");
      if (res.ok) {
        const data: FlightInfo[] = await res.json();
        // landed便を先頭に、次いでETAが近い順
        data.sort((a, b) => {
          if (a.status === "landed" && b.status !== "landed") return -1;
          if (b.status === "landed" && a.status !== "landed") return 1;
          const ta = new Date(a.estimatedArrival ?? a.scheduledArrival).getTime();
          const tb = new Date(b.estimatedArrival ?? b.scheduledArrival).getTime();
          return ta - tb;
        });
        setFlights(data);
        setLastUpdated(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // 監視中フライトがあれば2分、なければ10分でポーリング
  useEffect(() => {
    fetchArrivals();
    if (intervalRef.current) clearInterval(intervalRef.current);
    const ms = watchedFlightIata ? FLIGHT_REFRESH_URGENT_MS : FLIGHT_REFRESH_NORMAL_MS;
    intervalRef.current = setInterval(fetchArrivals, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchArrivals, watchedFlightIata]);

  // 監視中フライト情報
  const watchedFlightInfo = watchedFlightIata
    ? flights.find((f) => f.flightIata.toUpperCase() === watchedFlightIata.toUpperCase()) ?? null
    : null;

  // 着陸検知 → landedAt記録 + onLanding通知
  useEffect(() => {
    if (watchedFlightInfo?.status === "landed" && !landedAt) {
      const t = watchedFlightInfo.actualArrival
        ? new Date(watchedFlightInfo.actualArrival)
        : new Date();
      setLandedAt(t);
      onLanding?.(watchedFlightInfo.flightIata, watchedFlightInfo.terminal ?? null);
    }
    if (!watchedFlightInfo) {
      setLandedAt(null);
      setCustomsRemainSec(CUSTOMS_WAIT_SEC);
    }
  }, [watchedFlightInfo, landedAt]);

  // 着陸後カウントダウン（1秒ごと）
  useEffect(() => {
    if (!landedAt) return;
    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - landedAt.getTime()) / 1000);
      setCustomsRemainSec(Math.max(0, CUSTOMS_WAIT_SEC - elapsed));
    }, 1000);
    return () => clearInterval(iv);
  }, [landedAt]);

  async function searchFlight() {
    const q = search.trim().toUpperCase();
    if (!q) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/flights?flight=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: FlightInfo[] = await res.json();
        setSearchResult(data.length > 0 ? data[0] : "notfound");
      }
    } catch {
      setSearchResult("notfound");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          ✈️ 成田空港 到着便
          <span className="text-[9px] bg-sky-950 border border-sky-700 text-sky-400 px-1.5 py-0.5 rounded-full font-bold">LIVE</span>
        </h3>
        {lastUpdated && (
          <button type="button" onClick={fetchArrivals} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
            更新 {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </button>
        )}
      </div>

      {/* 着陸アラート（監視中フライト） */}
      {watchedFlightInfo && (() => {
        const eta = etaLabel(watchedFlightInfo);
        const isLanded = watchedFlightInfo.status === "landed";
        return (
          <div className={`rounded-2xl border p-4 space-y-2 ${
            isLanded ? "border-green-500 bg-green-950/30" :
            eta.urgent ? "border-amber-500/70 bg-amber-950/20" :
            "border-sky-700 bg-sky-950/20"
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{isLanded ? "🛬" : "✈️"}</span>
                <div>
                  <p className={`text-sm font-bold leading-tight ${isLanded ? "text-green-300" : eta.urgent ? "text-amber-300" : "text-sky-300"}`}>
                    {isLanded ? "着陸しました！出発してください" : eta.urgent ? `まもなく着陸: ${eta.text}` : `監視中: ${watchedFlightInfo.flightIata}`}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{watchedFlightInfo.flightIata} · {watchedFlightInfo.origin}</p>
                </div>
              </div>
              <button type="button" onClick={() => onWatch(null)} className="text-gray-600 hover:text-gray-400 text-xs flex-shrink-0 mt-0.5">✕</button>
            </div>
            {isLanded && (
              <p className="text-xs text-green-400 font-mono">
                ✅ 実際到着: {formatTime(watchedFlightInfo.actualArrival)}
                {watchedFlightInfo.terminal ? ` · T${watchedFlightInfo.terminal}` : ""}
                {watchedFlightInfo.gate ? ` G${watchedFlightInfo.gate}` : ""}
              </p>
            )}
            {isLanded && landedAt && (
              <div className={`rounded-xl px-3 py-2 flex items-center gap-2 ${
                customsRemainSec === 0
                  ? "bg-green-900/50 border border-green-500"
                  : "bg-gray-800/60 border border-gray-700"
              }`}>
                <span className="text-base">{customsRemainSec === 0 ? "✋" : "🛃"}</span>
                {customsRemainSec === 0 ? (
                  <p className="text-sm font-bold text-green-300">そろそろ税関を出る頃です！迎えに行きましょう</p>
                ) : (
                  <p className="text-sm text-gray-300">
                    税関出口まで目安:{" "}
                    <span className="font-mono font-bold text-amber-300">
                      {Math.floor(customsRemainSec / 60)}分{String(customsRemainSec % 60).padStart(2, "0")}秒
                    </span>
                  </p>
                )}
              </div>
            )}
            {!isLanded && eta.urgent && (
              <p className="text-[10px] text-amber-400/80">ポーリング間隔: 2分（通常: 10分）</p>
            )}
          </div>
        );
      })()}

      {/* フライト番号検索 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchFlight()}
          placeholder="フライト番号 例: NH847"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 font-mono focus:outline-none focus:border-sky-500 transition-colors"
        />
        <button
          type="button"
          onClick={searchFlight}
          disabled={searching}
          className="px-3 py-2 rounded-xl bg-sky-600 text-white font-semibold text-xs hover:bg-sky-500 transition-colors disabled:opacity-50"
        >
          {searching ? "…" : "検索"}
        </button>
      </div>

      {/* 検索結果 */}
      {searchResult && searchResult !== "notfound" && (
        <FlightRow f={searchResult} highlight />
      )}
      {searchResult === "notfound" && (
        <p className="text-xs text-red-400 px-1">フライトが見つかりません</p>
      )}

      {/* 到着一覧 */}
      {loading ? (
        <div className="text-center py-6 text-gray-600 text-sm">フライト情報を取得中…</div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {flights.slice(0, 12).map((f) => (
            <FlightRow key={f.flightIata} f={f} onWatch={onWatch} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-700 text-center">
        Powered by Aviationstack · {process.env.NEXT_PUBLIC_AVIATIONSTACK_MOCK === "1" ? "モックデータ" : "リアルタイム"}
      </p>
    </div>
  );
}

function FlightRow({ f, highlight = false, onWatch }: { f: FlightInfo; highlight?: boolean; onWatch?: (iata: string) => void }) {
  const eta = etaLabel(f);
  const isLanded = f.status === "landed";

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs transition-all ${
      highlight ? "border-sky-600 bg-sky-950/30" :
      isLanded ? "border-green-800/60 bg-green-950/20" :
      eta.urgent ? "border-amber-800/50 bg-amber-950/10" :
      "border-gray-800 bg-gray-800/30"
    }`}>
      {/* 到着状態インジケーター */}
      <div className="flex-shrink-0">
        {isLanded ? (
          <span className="text-green-400 text-sm">✅</span>
        ) : eta.urgent ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
        ) : (
          <span className="w-2 h-2 rounded-full bg-gray-700 inline-block flex-shrink-0" />
        )}
      </div>

      {/* フライト番号・航空会社 */}
      <div className="w-16 flex-shrink-0">
        <p className="font-bold text-white font-mono">{f.flightIata}</p>
        <p className="text-[9px] text-gray-600 truncate">{f.airline}</p>
      </div>

      {/* 出発地 */}
      <div className="flex-1 min-w-0">
        <p className="text-gray-300 truncate">{f.origin}</p>
        <p className="text-[9px] text-gray-600">{f.originIata}</p>
      </div>

      {/* ターミナル・ゲート */}
      <div className="flex-shrink-0 text-right space-y-0.5">
        {f.terminal && (
          <span className="inline-block bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[9px] font-bold">T{f.terminal}</span>
        )}
        {f.gate && (
          <p className="text-[9px] text-gray-600">G{f.gate}</p>
        )}
      </div>

      {/* ETA */}
      <div className="flex-shrink-0 text-right w-16">
        <p className={`font-bold ${eta.color}`}>{eta.text}</p>
        <p className="text-[9px] text-gray-600">
          {isLanded ? formatTime(f.actualArrival) : formatTime(f.estimatedArrival ?? f.scheduledArrival)}
        </p>
        {onWatch && (
          <button type="button" onClick={() => onWatch(f.flightIata)}
            className="mt-0.5 text-[9px] bg-sky-900/60 border border-sky-700/60 text-sky-400 px-1.5 py-0.5 rounded-full hover:bg-sky-800/60 transition-colors">
            監視
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── GPS Track Map (Google Maps) ─────────────────────────
const GMAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const NARITA_DEST = { lat: 35.7720, lng: 140.3928 }; // 成田T1

function loadGoogleMaps(): Promise<typeof google.maps> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject("no window");
    if (window.google?.maps) return resolve(window.google.maps);
    if (document.querySelector('script[data-gmaps]')) {
      // すでに読み込み中 — ポーリング（最大30秒でタイムアウト）
      let attempts = 0;
      const iv = setInterval(() => {
        if (window.google?.maps) { clearInterval(iv); resolve(window.google.maps); return; }
        if (++attempts > 300) { clearInterval(iv); reject(new Error("Google Maps load timeout")); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_API_KEY}`;
    script.async = true;
    script.setAttribute("data-gmaps", "1");
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function GpsTrackMap({ points, sendCount, heading }: { points: { lat: number; lng: number }[]; sendCount: number; heading: number | null }) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef = useRef<any>(null);
  const [followMode, setFollowMode] = useState(true); // true=現在地追従 / false=全体表示
  const [headingUp, setHeadingUp] = useState(false);  // true=進行方向UP / false=北UP固定
  const [driveMode, setDriveMode] = useState(false);  // true=ドライブモード（地図大・最小UI）
  const [expanded, setExpanded] = useState(false);    // 拡大表示モード

  // レースコンディション防止用 ref（init effect が async で完了した後に最新ポイントを参照するため）
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const followModeRef = useRef(followMode);
  followModeRef.current = followMode;
  const headingRef = useRef(heading);
  headingRef.current = heading;
  const headingUpRef = useRef(headingUp);
  headingUpRef.current = headingUp;

  // ポイント・マーカー・パン/ズームを地図に反映する共通関数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyPoints(gmaps: any, pts: { lat: number; lng: number }[], follow: boolean) {
    const map = mapRef.current;
    if (!map) return;

    // 成田空港ピン（常時表示）
    if (!destMarkerRef.current) {
      destMarkerRef.current = new gmaps.Marker({
        position: NARITA_DEST,
        map,
        zIndex: 5,
        title: "成田空港",
        label: { text: "空港", color: "#fff", fontWeight: "bold", fontSize: "10px" },
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2.5,
        },
      });
    }

    if (pts.length === 0) return;
    const latlngs = pts.map((p) => ({ lat: p.lat, lng: p.lng }));

    // ルートライン（走行済み軌跡）
    if (polylineRef.current) {
      polylineRef.current.setPath(latlngs);
    } else {
      polylineRef.current = new gmaps.Polyline({
        path: latlngs,
        geodesic: true,
        strokeColor: "#3b82f6",  // 青: 走行済みルート
        strokeOpacity: 0.85,
        strokeWeight: 6,
        map,
      });
    }

    // スタートマーカー（S）― 最初の1回だけ
    if (!startMarkerRef.current) {
      startMarkerRef.current = new gmaps.Marker({
        position: latlngs[0],
        map,
        zIndex: 1,
        title: "出発地",
        label: { text: "S", color: "#fff", fontWeight: "bold", fontSize: "12px" },
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
    }

    // 現在地マーカー（進行方向を向いたナビ矢印）― ポイント追加のたびに移動・回転
    const last = latlngs[latlngs.length - 1];
    const h = headingRef.current;
    const navIcon = {
      path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7,
      fillColor: "#f97316",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2,
      rotation: (h !== null && !Number.isNaN(h)) ? h : 0,
    };
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setPosition(last);
      currentMarkerRef.current.setIcon(navIcon); // heading変化のたびに回転更新
    } else {
      currentMarkerRef.current = new gmaps.Marker({
        position: last,
        map,
        zIndex: 10,
        title: "現在地",
        icon: navIcon,
      });
    }

    // パン / ズーム
    if (follow) {
      map.panTo(last);
      if (map.getZoom() < 15) map.setZoom(16);
    } else if (pts.length >= 2) {
      const bounds = new gmaps.LatLngBounds();
      latlngs.forEach((p) => bounds.extend(p));
      bounds.extend(NARITA_DEST); // 目的地も含める
      map.fitBounds(bounds, 40);
    } else {
      map.setCenter(last);
      map.setZoom(16);
    }

    // 進行方向UP（ヘディングアップ）/ 北UP（hは上で定義済み）
    if (headingUpRef.current && h !== null && !Number.isNaN(h)) {
      map.setHeading(h);
    } else {
      map.setHeading(0);
    }
  }

  // マップ初期化（マウント時1回）― 完了後に既存ポイントを即描画してレースコンディション解消
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    let mounted = true;

    loadGoogleMaps().then((gmaps) => {
      if (!mounted || !mapDivRef.current || mapRef.current) return;
      const map = new gmaps.Map(mapDivRef.current, {
        zoom: 13,
        center: NARITA_DEST,
        mapTypeId: "roadmap",
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      // 初期化完了時点の最新ポイントを即描画（ポイントエフェクトが先に走っていた場合の救済）
      applyPoints(gmaps, pointsRef.current, followModeRef.current);
    }).catch(() => {});

    return () => {
      mounted = false;
      mapRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      currentMarkerRef.current = null;
      destMarkerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ポイント更新時にルート・マーカーを反映（mapRef.current が null なら init 完了後に描画される）
  useEffect(() => {
    if (!mapRef.current) return;
    loadGoogleMaps().then((gmaps) => {
      applyPoints(gmaps, points, followMode);
    }).catch((err) => console.error("[Map] Google Maps error:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, followMode]);

  // 拡大/縮小・ドライブモード切替時にGoogleマップへリサイズ通知
  useEffect(() => {
    if (!mapRef.current) return;
    const t = setTimeout(() => {
      loadGoogleMaps().then((gmaps) => {
        if (!mapRef.current) return;
        gmaps.event.trigger(mapRef.current, "resize");
        applyPoints(gmaps, pointsRef.current, followModeRef.current);
      }).catch(() => {});
    }, 320);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, driveMode]);

  // 進行方向が変わったら: 地図回転（ヘディングアップ時）+ 矢印マーカー回転（常時）
  useEffect(() => {
    if (!mapRef.current || heading === null || Number.isNaN(heading)) return;
    if (headingUp) mapRef.current.setHeading(heading);
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setIcon({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        path: (window as any).google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW ?? 1,
        scale: 7,
        fillColor: "#f97316",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
        rotation: heading,
      });
    }
  }, [heading, headingUp]);

  const mapHeight = driveMode ? "560px" : expanded ? "400px" : "280px";

  // Googleマップナビ URL（現在地→成田空港）
  const navUrl = points.length > 0
    ? `https://maps.google.com/?saddr=${points[points.length - 1].lat},${points[points.length - 1].lng}&daddr=${NARITA_DEST.lat},${NARITA_DEST.lng}&travelmode=driving`
    : `https://maps.google.com/?daddr=${NARITA_DEST.lat},${NARITA_DEST.lng}&travelmode=driving`;

  return (
    <div className="space-y-1.5">
      {/* ナビボタン（走行中は必ずこちらを使う） */}
      <a
        href={navUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-colors"
      >
        🗺 Googleマップでナビ開始（成田空港）
      </a>

      {/* ドライブモードON/OFF（ミラーリング時はこれをON） */}
      <button
        type="button"
        onClick={() => { setDriveMode((v) => !v); setFollowMode(true); setHeadingUp(true); }}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors ${
          driveMode
            ? "bg-amber-500 text-black"
            : "bg-gray-800 border border-gray-600 text-gray-300 hover:border-amber-500"
        }`}
      >
        {driveMode ? "🚗 ドライブモード ON（タップで解除）" : "🚗 ドライブモード（ミラーリング時）"}
      </button>

      {/* ツールバー（ドライブモード中は非表示） */}
      {!driveMode && (
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFollowMode(true)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                followMode ? "bg-sky-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
            >
              📍 追従
            </button>
            <button
              type="button"
              onClick={() => setFollowMode(false)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                !followMode ? "bg-green-700 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
            >
              🗺 全体
            </button>
            <button
              type="button"
              onClick={() => setHeadingUp((v) => !v)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-colors ${
                headingUp ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
              title="進行方向を常に上に表示"
            >
              {headingUp ? "🧭 進行方向UP" : "🧭 北UP"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
          >
            {expanded ? "⬆ 縮小" : "⬇ 拡大"}
          </button>
        </div>
      )}

      {/* 地図本体 */}
      <div className="relative">
        <div
          ref={mapDivRef}
          className="w-full rounded-xl border border-gray-700 overflow-hidden transition-all duration-300"
          style={{ height: mapHeight }}
        />
        {points.length === 0 && (
          <div className="absolute inset-0 rounded-xl bg-gray-900/80 flex items-center justify-center text-gray-400 text-sm">
            GPS記録待機中…
          </div>
        )}
        {/* ドライブモード中：進行方向インジケーター */}
        {driveMode && heading !== null && !Number.isNaN(heading) && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-lg">
            🧭 {Math.round(heading)}°
          </div>
        )}
      </div>

      {!driveMode && (
        <div className="flex justify-between text-[10px] text-gray-600 px-1">
          <span>🟢 出発地 &nbsp;🟠 現在地 &nbsp;🔵 成田空港</span>
          <span>📡 {sendCount} 回送信</span>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── PIN Gate ─────────────────────────
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, role: "driver" }),
      });
      const { ok } = await res.json();
      if (ok) {
        onUnlock();
      } else {
        setError(true);
        setPin("");
        setTimeout(() => setError(false), 1500);
      }
    } catch {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="text-6xl">🔒</div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">ドライバー専用</h2>
        <p className="text-xs text-gray-500 mt-1">Driver Access Only</p>
      </div>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN"
          className={`w-full text-center text-2xl font-mono tracking-[0.5em] bg-gray-800 border rounded-xl px-4 py-3 text-gray-100 focus:outline-none transition-colors ${
            error ? "border-red-500" : "border-gray-700 focus:border-amber-500"
          }`}
        />
        {error && <p className="text-xs text-red-400 text-center">PINが違います</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

// ───────────────────────── Photo Capture ─────────────────────────
function PhotoCapture({ bookingId, photoType }: { bookingId: string; photoType: "pickup" | "delivery" }) {
  const inputId = useId();
  const [thumb, setThumb] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const API = process.env.NEXT_PUBLIC_API_URL ?? "";

  async function handleFile(file: File) {
    setStatus("uploading");
    // canvas で JPEG 圧縮（長辺800px以内）
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((r) => { img.onload = r; });
    const max = 800;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    setThumb(dataUrl);
    try {
      const res = await fetch(`${API}/bookings/${bookingId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_type: photoType, data_url: dataUrl }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  const label = photoType === "pickup" ? "📷 受取写真" : "📷 配達完了写真";
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
        status === "done"      ? "border-green-600 bg-green-900/20 text-green-400" :
        status === "uploading" ? "border-gray-600 bg-gray-800/50 text-gray-500" :
        status === "error"     ? "border-red-600 bg-red-900/20 text-red-400" :
        "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500"
      }`}>
        {status === "done" ? "✓ 送信完了" : status === "uploading" ? "送信中…" : status === "error" ? "再試行" : label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="証跡" className="w-full rounded-xl object-cover max-h-36 border border-gray-700" />
      )}
    </div>
  );
}

// ───────────────────────── Delivery Card ─────────────────────────
function DeliveryCard({
  delivery,
  onStatusNext,
  onToggleGps,
  onToggleRouteType,
}: {
  delivery: ActiveDelivery;
  onStatusNext: (id: string) => void;
  onToggleGps: (id: string) => void;
  onToggleRouteType: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[delivery.status];
  const nextCfg = cfg.next ? STATUS_CONFIG[cfg.next] : null;
  const isHighway = delivery.routeType === "highway";

  return (
    <div className={`bg-gray-900 rounded-2xl p-4 space-y-3 ${delivery.customsExited ? "border-2 border-green-500" : "border border-gray-800"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white font-mono">{delivery.bookingId}</p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* 税関通過通知 */}
      {delivery.customsExited && (
        <div className="flex items-center gap-2 bg-green-950/40 border border-green-600 rounded-xl px-3 py-2">
          <span className="text-lg">✋</span>
          <p className="text-sm font-bold text-green-300">お客様が税関を出ました！</p>
        </div>
      )}

      {/* お客からの定型メッセージ */}
      {delivery.customerMessage && DRIVER_MSG_LABELS[delivery.customerMessage] && (() => {
        const msg = DRIVER_MSG_LABELS[delivery.customerMessage];
        const isRecent = delivery.customerMessageAt
          ? (Date.now() - new Date(delivery.customerMessageAt).getTime()) < 5 * 60 * 1000
          : false;
        return (
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isRecent ? "bg-amber-950/40 border border-amber-500 animate-pulse" : "bg-gray-800 border border-gray-700"}`}>
            <span className="text-lg">{msg.icon}</span>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${isRecent ? "text-amber-200" : "text-gray-400"}`}>{msg.ja}</p>
              {delivery.customerMessageAt && (
                <p className="text-[10px] text-gray-600">{new Date(delivery.customerMessageAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</p>
              )}
            </div>
            {isRecent && <span className="ml-auto text-[10px] font-bold text-amber-400 flex-shrink-0">NEW</span>}
          </div>
        );
      })()}

      {/* ルート種別トグル */}
      <button
        type="button"
        onClick={() => onToggleRouteType(delivery.bookingId)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
          isHighway
            ? "border-violet-600 bg-violet-950/30"
            : "border-green-800 bg-green-950/20"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{isHighway ? "🛣️" : "🏘️"}</span>
          <div className="text-left">
            <p className={`text-xs font-bold ${isHighway ? "text-violet-300" : "text-green-400"}`}>
              {isHighway ? "高速道路" : "一般道"}
            </p>
            <p className="text-[10px] text-gray-600">
              {isHighway ? "学習: 高速ルート" : "学習: 一般ルート"}
            </p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          isHighway ? "bg-violet-900/50 text-violet-400" : "bg-green-900/40 text-green-500"
        }`}>
          タップで切替
        </span>
      </button>

      {/* GPS状態 */}
      <button
        type="button"
        onClick={() => onToggleGps(delivery.bookingId)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
          delivery.gpsActive
            ? "border-sky-600 bg-sky-950/30"
            : "border-gray-700 bg-gray-800/50"
        }`}
      >
        <div className="relative flex-shrink-0">
          {delivery.gpsActive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" />
          )}
        </div>
        <p className={`text-xs font-semibold ${delivery.gpsActive ? "text-sky-400" : "text-gray-400"}`}>
          {delivery.gpsActive ? "GPS送信中（30秒ごと）" : "GPS追跡を開始"}
        </p>
        {delivery.gpsActive && (
          <span className="ml-auto text-[10px] text-sky-600">タップで停止</span>
        )}
      </button>

      {/* GPS地図 */}
      {delivery.gpsActive && (
        <GpsTrackMap points={delivery.trackPoints} sendCount={delivery.sendCount} heading={delivery.heading} />
      )}

      {/* ステータス更新ボタン */}
      {nextCfg && cfg.next && (
        <button
          type="button"
          onClick={() => onStatusNext(delivery.bookingId)}
          className={`w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-colors ${nextCfg.color} hover:opacity-90`}
        >
          {nextCfg.label} に更新
        </button>
      )}

      {/* ドライバー→お客 定型メッセージ */}
      {delivery.status !== "done" && (
        <DriverMessagePanel bookingId={delivery.bookingId} />
      )}

      {/* 証跡写真 */}
      {delivery.status === "arrived" && (
        <PhotoCapture bookingId={delivery.bookingId} photoType="pickup" />
      )}
      {delivery.status === "done" && (
        <PhotoCapture bookingId={delivery.bookingId} photoType="delivery" />
      )}
    </div>
  );
}

function DriverMessagePanel({ bookingId }: { bookingId: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(key: string) {
    if (loading) return;
    setLoading(true);
    await pushDriverMessage(bookingId, key);
    setSent(key);
    setLoading(false);
    // 10秒後にリセット（再送可能に）
    setTimeout(() => setSent(null), 10_000);
  }

  const sentMsg = sent ? DRIVER_TO_CUSTOMER_MSGS.find((m) => m.key === sent) : null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-gray-600 px-1">お客様へメッセージ送信</p>
      {sentMsg ? (
        <div className="flex items-center gap-2 bg-sky-950/40 border border-sky-600 rounded-xl px-3 py-2">
          <span className="text-base">{sentMsg.icon}</span>
          <p className="text-xs font-semibold text-sky-300">{sentMsg.ja}</p>
          <span className="ml-auto text-[10px] text-sky-500">送信済み ✓</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {DRIVER_TO_CUSTOMER_MSGS.map((m) => (
            <button
              key={m.key}
              type="button"
              disabled={loading}
              onClick={() => send(m.key)}
              className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-sky-500 rounded-xl px-3 py-2 text-left transition-colors disabled:opacity-50"
            >
              <span className="text-base">{m.icon}</span>
              <span className="text-xs text-gray-300">{m.ja}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Main ─────────────────────────
export default function DriverView({ tr }: { tr: Translation }) {
  const [unlocked, setUnlocked] = useState(false);
  const [bookingInput, setBookingInput] = useState("");
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [tomorrowBookings, setTomorrowBookings] = useState<{ booking_id: string; name: string; total_amount: number }[]>([]);
  const [watchedFlightIata, setWatchedFlightIata] = useState<string | null>(null);
  const [parkingStart, setParkingStart] = useState<Date | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // GPS ON時に画面スリープを防止、OFF時に解除
  const acquireWakeLock = async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch { /* 非対応端末は無視 */ }
  };
  const releaseWakeLock = () => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  };

  // 着陸検知 → OpenClaw経由でオペレーターへLINE通知
  const handleLanding = async (flightIata: string, terminal: string | null) => {
    const t = terminal ? `T${terminal}` : "成田";
    const msg = `✈️ [KAIROX] ${flightIata} が着陸しました。${t}出口に約45分後にお客様が出てきます。`;
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "operator", message: msg, event: "landing" }),
      });
    } catch { /* 通知失敗は無視 */ }
  };
  const [parkingRemain, setParkingRemain] = useState(1800);
  const watchIds = useRef<Map<string, number>>(new Map());
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // コンポーネントアンマウント時にGPS停止
  useEffect(() => {
    return () => {
      watchIds.current.forEach((id) => navigator.geolocation?.clearWatch(id));
      intervals.current.forEach((id) => clearInterval(id));
    };
  }, []);

  // 当日・翌日のKAIROX予約を取得
  useEffect(() => {
    if (!unlocked) return;
    fetch("/api/admin?type=bookings")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: { booking_id: string; name: string; total_amount: number; pickup_date: string; status: string }[]) => {
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tStr = tomorrow.toISOString().slice(0, 10);
        setTomorrowBookings(
          rows.filter((b) => {
            const d = b.pickup_date?.slice(0, 10);
            return (d === today || d === tStr) && !["delivered", "cancelled"].includes(b.status);
          })
        );
      })
      .catch(() => {});
  }, [unlocked]);

  // 駐車30分カウントダウン
  useEffect(() => {
    if (!parkingStart) return;
    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - parkingStart.getTime()) / 1000);
      setParkingRemain(Math.max(0, 1800 - elapsed));
    }, 1000);
    return () => clearInterval(iv);
  }, [parkingStart]);

  // 顧客の customs_exited をポーリング（30秒ごと）
  useEffect(() => {
    const active = deliveries.filter((d) => d.status !== "done");
    if (active.length === 0) return;
    let cancelled = false;
    const poll = async () => {
      for (const d of active) {
        try {
          const res = await fetch(`/api/booking?id=${encodeURIComponent(d.bookingId)}`);
          if (!res.ok || cancelled) continue;
          const data = await res.json();
          const needsUpdate =
            (data.customs_exited && !d.customsExited) ||
            (data.customer_message && data.customer_message !== d.customerMessage);
          if (needsUpdate) {
            setDeliveries((prev) => prev.map((x) =>
              x.bookingId === d.bookingId
                ? { ...x, customsExited: data.customs_exited ?? x.customsExited, customerMessage: data.customer_message ?? x.customerMessage, customerMessageAt: data.customer_message_at ?? x.customerMessageAt }
                : x
            ));
          }
        } catch { /* ignore */ }
      }
    };
    poll();
    const iv = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(iv); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveries.map((d) => d.bookingId + d.status).join(",")]);

  function addDelivery() {
    const id = bookingInput.trim().toUpperCase();
    if (!id.startsWith("KRX-") || deliveries.find((d) => d.bookingId === id)) return;
    setDeliveries((prev) => [...prev, { bookingId: id, status: "heading", gpsActive: false, routeType: "local", trackPoints: [], sendCount: 0, customsExited: false, customerMessage: null, customerMessageAt: null, heading: null }]);
    setBookingInput("");
  }

  function toggleRouteType(bookingId: string) {
    setDeliveries((prev) => prev.map((d) =>
      d.bookingId === bookingId
        ? { ...d, routeType: d.routeType === "highway" ? "local" : "highway" }
        : d
    ));
  }

  function toggleGps(bookingId: string) {
    const delivery = deliveries.find((d) => d.bookingId === bookingId);
    if (!delivery) return;

    if (delivery.gpsActive) {
      // GPS停止 + Wake Lock解除
      const wid = watchIds.current.get(bookingId);
      if (wid !== undefined) navigator.geolocation?.clearWatch(wid);
      const iid = intervals.current.get(bookingId);
      if (iid !== undefined) clearInterval(iid);
      watchIds.current.delete(bookingId);
      intervals.current.delete(bookingId);
      releaseWakeLock();
      setDeliveries((prev) => prev.map((d) => d.bookingId === bookingId ? { ...d, gpsActive: false } : d));
    } else {
      // GPS開始
      if (!navigator.geolocation) {
        alert("このデバイスはGPSに対応していません");
        return;
      }
      let lastLat = 0, lastLng = 0;

      // 30秒ごとの定期送信（lastLat/lngが有効な場合のみ）
      const send = () => {
        if (lastLat === 0 && lastLng === 0) return;
        setDeliveries((prev) => {
          const d = prev.find((x) => x.bookingId === bookingId);
          if (!d) return prev;
          pushLocation(bookingId, lastLat, lastLng, d.status, d.routeType);
          return prev.map((x) => x.bookingId === bookingId ? { ...x, sendCount: x.sendCount + 1 } : x);
        });
      };

      const GPS_MIN_DIST_M = 15; // 15m未満の移動はノイズとして無視
      const GPS_MAX_POINTS = 100; // 地図に表示する最大ポイント数

      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          const newHeading = pos.coords.heading; // 進行方向（度、北=0）※静止中はnull
          // 前回地点から15m以上移動した場合のみ更新（ノイズ除去）
          if (lastLat !== 0 && calcDistanceM(lastLat, lastLng, newLat, newLng) < GPS_MIN_DIST_M) return;
          lastLat = newLat;
          lastLng = newLng;
          const dist = distToNarita(lastLat, lastLng);
          setDeliveries((prev) => prev.map((d) => {
            if (d.bookingId !== bookingId) return d;
            const newPoints = [...d.trackPoints, { lat: lastLat, lng: lastLng }];
            // 100件超えたら古い点を削除（スライディングウィンドウ）
            const trimmed = newPoints.length > GPS_MAX_POINTS ? newPoints.slice(-GPS_MAX_POINTS) : newPoints;
            const updated = { ...d, trackPoints: trimmed, heading: newHeading };
            // heading 中で500m以内 → 「近くにいます」自動切替
            if (d.status === "heading" && dist <= NEARBY_THRESHOLD_M) {
              pushStatus(bookingId, "nearby", d.routeType);
              return { ...updated, status: "nearby" as DriverStatus };
            }
            return updated;
          }));
        },
        (err) => {
          if (err.code === 1) {
            alert("GPS位置情報の許可が必要です。ブラウザの設定を確認してください。");
          } else {
            console.warn("[GPS] watchPosition error:", err.message);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );

      const iid = setInterval(send, GPS_INTERVAL_MS);
      watchIds.current.set(bookingId, wid);
      intervals.current.set(bookingId, iid);
      acquireWakeLock(); // 画面スリープを防止

      setDeliveries((prev) => prev.map((d) => d.bookingId === bookingId ? { ...d, gpsActive: true } : d));
    }
  }

  function statusNext(bookingId: string) {
    setDeliveries((prev) => prev.map((d) => {
      if (d.bookingId !== bookingId) return d;
      const next = STATUS_CONFIG[d.status].next;
      if (!next) return d;
      if (d.gpsActive) {
        // GPS ON: 位置情報つきで送信
        navigator.geolocation?.getCurrentPosition(
          (pos) => pushLocation(bookingId, pos.coords.latitude, pos.coords.longitude, next, d.routeType),
          () => pushStatus(bookingId, next, d.routeType),
        );
      } else {
        // GPS OFF でもステータスは必ず送信
        pushStatus(bookingId, next, d.routeType);
      }
      return { ...d, status: next };
    }));
  }

  function removeDelivery(bookingId: string) {
    const wid = watchIds.current.get(bookingId);
    if (wid !== undefined) navigator.geolocation?.clearWatch(wid);
    const iid = intervals.current.get(bookingId);
    if (iid !== undefined) clearInterval(iid);
    watchIds.current.delete(bookingId);
    intervals.current.delete(bookingId);
    setDeliveries((prev) => prev.filter((d) => d.bookingId !== bookingId));
  }

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">🚐 ドライバー管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">GPS位置情報をリアルタイム送信</p>
        </div>
        <button
          type="button"
          onClick={() => setUnlocked(false)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* 翌日KAIROX優先アラート */}
      {tomorrowBookings.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-2xl">🚗</span>
          <div>
            <p className="text-sm font-bold text-amber-300">本日・翌日のKAIROX予約</p>
            <p className="text-xs text-amber-400/80 mt-0.5">下請けはお断りしてください</p>
            <div className="mt-2 space-y-0.5">
              {tomorrowBookings.map((b) => (
                <p key={b.booking_id} className="text-[10px] text-amber-300/70 font-mono">
                  {b.booking_id} · {b.name} · ¥{b.total_amount.toLocaleString()}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 予約追加 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={bookingInput}
          onChange={(e) => setBookingInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDelivery()}
          placeholder="KRX-XXXXXX"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 font-mono focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          type="button"
          onClick={addDelivery}
          className="px-4 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
        >
          追加
        </button>
      </div>

      {/* 配送一覧 */}
      {deliveries.length === 0 ? (
        <div className="text-center py-8 text-gray-700">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">追跡番号を入力してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <div key={d.bookingId} className="relative">
              <DeliveryCard
                delivery={d}
                onStatusNext={statusNext}
                onToggleGps={toggleGps}
                onToggleRouteType={toggleRouteType}
              />
              <button
                type="button"
                onClick={() => removeDelivery(d.bookingId)}
                className="absolute top-3 right-3 text-gray-700 hover:text-gray-400 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── 30分無料駐車タイマー ─── */}
      <div className="border-t border-gray-800 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">🅿️ 無料駐車タイマー</p>
          <p className="text-[10px] text-gray-600">P1〜P5 30分無料</p>
        </div>
        {!parkingStart ? (
          <button type="button"
            onClick={() => { setParkingStart(new Date()); setParkingRemain(1800); }}
            className="w-full py-2.5 rounded-xl bg-green-700 text-white font-semibold text-sm hover:bg-green-600 transition-colors">
            🚗 入庫 → タイマースタート
          </button>
        ) : (
          <div className={`rounded-2xl border p-4 text-center space-y-1 ${
            parkingRemain <= 300 ? "border-red-600 bg-red-950/30" :
            parkingRemain <= 600 ? "border-amber-600 bg-amber-950/20" :
            "border-green-700 bg-green-950/20"
          }`}>
            <p className={`text-5xl font-black font-mono tabular-nums tracking-tight ${
              parkingRemain <= 300 ? "text-red-400" :
              parkingRemain <= 600 ? "text-amber-400" :
              "text-green-400"
            }`}>
              {String(Math.floor(parkingRemain / 60)).padStart(2, "0")}:{String(parkingRemain % 60).padStart(2, "0")}
            </p>
            <p className="text-xs text-gray-500">
              {parkingRemain > 0 ? "無料残り時間" : "⚠️ 無料時間終了！出庫してください"}
            </p>
            <button type="button" onClick={() => setParkingStart(null)}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors mt-1">
              リセット
            </button>
          </div>
        )}
      </div>

      {/* ─── フライト情報ボード ─── */}
      <div className="border-t border-gray-800 pt-5">
        <FlightBoard watchedFlightIata={watchedFlightIata} onWatch={setWatchedFlightIata} onLanding={handleLanding} />
      </div>

    </div>
  );
}
