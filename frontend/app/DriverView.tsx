"use client";

import { useState, useEffect, useRef, useCallback, useId } from "react";
import type { Translation } from "./i18n";
import type { FlightInfo } from "./api/flights/route";

// ───────────────────────── 定数 ─────────────────────────
const GPS_INTERVAL_MS = 30_000; // 30秒ごとに送信
const FLIGHT_REFRESH_NORMAL_MS = 600_000; // 10分（通常）
const FLIGHT_REFRESH_URGENT_MS  = 120_000; // 2分（監視中フライトが着陸20分前以内）

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

function FlightBoard({ watchedFlightIata, onWatch }: {
  watchedFlightIata: string | null;
  onWatch: (iata: string | null) => void;
}) {
  const [flights, setFlights] = useState<FlightInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<FlightInfo | null | "notfound">(null);
  const [searching, setSearching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

// ───────────────────────── GPS Track Canvas ─────────────────────────
function GpsTrackCanvas({ points, sendCount }: { points: { lat: number; lng: number }[]; sendCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // 背景
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    if (points.length < 2) {
      // 点が1つ以下: 待機表示
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(points.length === 0 ? "GPS記録待機中…" : "移動データ収集中…", W / 2, H / 2);
      return;
    }

    // 正規化: lat/lng → canvas座標
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 20;
    const rangeW = maxLng - minLng || 0.0001;
    const rangeH = maxLat - minLat || 0.0001;

    function toX(lng: number) { return pad + ((lng - minLng) / rangeW) * (W - pad * 2); }
    function toY(lat: number) { return H - pad - ((lat - minLat) / rangeH) * (H - pad * 2); }

    // グリッド
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = (W / 4) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      const y = (H / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // ルートライン（グラデーション: 緑→水色）
    const grad = ctx.createLinearGradient(
      toX(points[0].lng), toY(points[0].lat),
      toX(points[points.length - 1].lng), toY(points[points.length - 1].lat)
    );
    grad.addColorStop(0, "#22c55e");
    grad.addColorStop(1, "#38bdf8");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(toX(points[0].lng), toY(points[0].lat));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(points[i].lng), toY(points[i].lat));
    }
    ctx.stroke();

    // 出発点（緑丸）
    ctx.beginPath();
    ctx.arc(toX(points[0].lng), toY(points[0].lat), 5, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();

    // 現在地（水色・外光輪）
    const cx = toX(points[points.length - 1].lng);
    const cy = toY(points[points.length - 1].lat);
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56,189,248,0.2)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();
  }, [points]);

  return (
    <div className="space-y-1.5">
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        className="w-full rounded-xl border border-gray-700"
      />
      <div className="flex justify-between text-[10px] text-gray-600 px-1">
        <span>📍 {points.length} ポイント記録中</span>
        <span>📡 送信 {sendCount} 回</span>
      </div>
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
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white font-mono">{delivery.bookingId}</p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

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
        <GpsTrackCanvas points={delivery.trackPoints} sendCount={delivery.sendCount} />
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

// ───────────────────────── Main ─────────────────────────
export default function DriverView({ tr }: { tr: Translation }) {
  const [unlocked, setUnlocked] = useState(false);
  const [bookingInput, setBookingInput] = useState("");
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [tomorrowBookings, setTomorrowBookings] = useState<{ booking_id: string; name: string; total_amount: number }[]>([]);
  const [watchedFlightIata, setWatchedFlightIata] = useState<string | null>(null);
  const [parkingStart, setParkingStart] = useState<Date | null>(null);
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

  function addDelivery() {
    const id = bookingInput.trim().toUpperCase();
    if (!id.startsWith("KRX-") || deliveries.find((d) => d.bookingId === id)) return;
    setDeliveries((prev) => [...prev, { bookingId: id, status: "heading", gpsActive: false, routeType: "local", trackPoints: [], sendCount: 0 }]);
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
      // GPS停止
      const wid = watchIds.current.get(bookingId);
      if (wid !== undefined) navigator.geolocation?.clearWatch(wid);
      const iid = intervals.current.get(bookingId);
      if (iid !== undefined) clearInterval(iid);
      watchIds.current.delete(bookingId);
      intervals.current.delete(bookingId);
      setDeliveries((prev) => prev.map((d) => d.bookingId === bookingId ? { ...d, gpsActive: false } : d));
    } else {
      // GPS開始
      if (!navigator.geolocation) {
        alert("このデバイスはGPSに対応していません");
        return;
      }
      let lastLat = 0, lastLng = 0;

      const send = () => {
        if (lastLat === 0) return;
        setDeliveries((prev) => {
          const d = prev.find((x) => x.bookingId === bookingId);
          if (!d) return prev;
          pushLocation(bookingId, lastLat, lastLng, d.status, d.routeType);
          return prev.map((x) => x.bookingId === bookingId ? { ...x, sendCount: x.sendCount + 1 } : x);
        });
      };

      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          lastLat = pos.coords.latitude;
          lastLng = pos.coords.longitude;
          setDeliveries((prev) => prev.map((d) =>
            d.bookingId === bookingId
              ? { ...d, trackPoints: [...d.trackPoints, { lat: lastLat, lng: lastLng }] }
              : d
          ));
        },
        (err) => console.warn("[GPS] watchPosition error:", err.message),
        { enableHighAccuracy: true, timeout: 10000 },
      );

      const iid = setInterval(send, GPS_INTERVAL_MS);
      watchIds.current.set(bookingId, wid);
      intervals.current.set(bookingId, iid);

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
        <FlightBoard watchedFlightIata={watchedFlightIata} onWatch={setWatchedFlightIata} />
      </div>

    </div>
  );
}
