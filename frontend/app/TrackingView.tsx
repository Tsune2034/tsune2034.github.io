"use client";

import { useState, useEffect, useCallback } from "react";
import type { Translation } from "./i18n";

// ───────────────────────── Types ─────────────────────────
type DeliveryStatus = "booked" | "confirmed" | "pickup" | "transit" | "delivered";

interface DriverInfo {
  lat: number;
  lng: number;
  status: string;       // "heading" | "nearby" | "arrived"
  updatedAt: string;
  distanceKm: number;
  etaMin: number;
}

interface TrackingInfo {
  trackingNumber: string;
  status: DeliveryStatus;
  from: string;
  to: string;
  eta: string;
  updatedAt: string;
  driver?: DriverInfo;
}

// ───────────────────────── Helpers ─────────────────────────
const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  chitose: { lat: 42.8193, lng: 141.6488 },
  sapporo: { lat: 43.0621, lng: 141.3544 },
  otaru:   { lat: 43.1907, lng: 140.9947 },
  furano:  { lat: 43.3499, lng: 142.3834 }, // 新富良野プリンスホテル付近
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ───────────────────────── Mock fallback ─────────────────────────
function mockTrack(num: string): TrackingInfo | null {
  const clean = num.trim().toUpperCase();
  if (!clean.startsWith("KRX-") || clean.length < 8) return null;

  const charSum = clean.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const statuses: DeliveryStatus[] = ["confirmed", "pickup", "transit", "delivered"];
  const status = statuses[charSum % 4];

  const destinations = ["ヒルトン札幌", "新千歳空港 国際線 2F", "ドーミーイン小樽"];
  const pickups     = ["新千歳 国際線 到着ロビー", "三井アウトレット レラ", "大通公園 観光案内所前", "小樽運河観光案内所前"];

  const now = new Date();
  const eta = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  // transit / pickup 状態ならモックドライバーを表示
  const driverStatuses = ["heading", "nearby", "arrived"] as const;
  const driver: DriverInfo | undefined =
    status === "transit" || status === "pickup"
      ? {
          lat: 42.85,
          lng: 141.60,
          status: driverStatuses[charSum % 3],
          updatedAt: now.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
          distanceKm: 2 + (charSum % 8),
          etaMin: Math.round(((2 + (charSum % 8)) / 30) * 60),
        }
      : undefined;

  return {
    trackingNumber: clean,
    status,
    from: pickups[charSum % 4],
    to: destinations[charSum % 3],
    eta: eta.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    updatedAt: now.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    driver,
  };
}

// ───────────────────────── Status config ─────────────────────────
const STATUS_STEPS: DeliveryStatus[] = ["confirmed", "pickup", "transit", "delivered"];

const STATUS_ICONS: Record<DeliveryStatus, string> = {
  booked:    "📋",
  confirmed: "📋",
  pickup:    "📦",
  transit:   "🚐",
  delivered: "🏨",
};

// ───────────────────────── Driver Location Card ─────────────────────────
function DriverCard({ driver, tr }: { driver: DriverInfo; tr: Translation }) {
  const pct = Math.max(0, Math.min(100, 100 - (driver.distanceKm / 15) * 100));
  const statusColor =
    driver.status === "arrived"  ? "text-green-400"  :
    driver.status === "nearby"   ? "text-amber-400"  : "text-sky-400";
  const statusLabel =
    driver.status === "arrived"  ? tr.driver_arrived :
    driver.status === "nearby"   ? tr.driver_nearby  : tr.driver_heading;

  return (
    <div className="bg-gray-800/60 border border-sky-800/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚐</span>
          <div>
            <p className="text-xs font-bold text-sky-400">{tr.driver_location_title}</p>
            <p className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{driver.distanceKm.toFixed(1)} km</p>
          <p className="text-[10px] text-gray-500">{tr.driver_eta_label} {driver.etaMin}{tr.driver_eta_min}</p>
        </div>
      </div>

      {/* 距離バー */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>📍 {tr.driver_pickup}</span>
          <span>🏨 {tr.driver_destination}</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-amber-400 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-end gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
          </span>
          <span className="text-[10px] text-sky-400">{tr.driver_live}</span>
          <span className="text-[10px] text-gray-600 ml-1">{driver.updatedAt}</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Timeline ─────────────────────────
function Timeline({ info, tr }: { info: TrackingInfo; tr: Translation }) {
  const currentIdx = STATUS_STEPS.indexOf(info.status);
  const labels: Partial<Record<DeliveryStatus, string>> = {
    confirmed: tr.track_status_booked,
    pickup:    tr.track_status_pickup,
    transit:   tr.track_status_transit,
    delivered: tr.track_status_delivered,
  };

  return (
    <div className="relative">
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-800" />
      <div className="space-y-6">
        {STATUS_STEPS.map((s, i) => {
          const done    = i < currentIdx;
          const active  = i === currentIdx;
          const pending = i > currentIdx;
          return (
            <div key={s} className="flex items-start gap-4 relative">
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                done   ? "bg-amber-500" :
                active ? "bg-amber-500 ring-4 ring-amber-500/30" :
                         "bg-gray-800 border border-gray-700"
              }`}>
                {done ? "✓" : STATUS_ICONS[s]}
              </div>
              <div className={`pt-1.5 ${pending ? "opacity-40" : ""}`}>
                <p className={`text-sm font-semibold ${active ? "text-amber-400" : done ? "text-white" : "text-gray-500"}`}>
                  {labels[s]}
                </p>
                {active && (
                  <p className="text-xs text-gray-500 mt-0.5">{tr.track_updated}: {info.updatedAt}</p>
                )}
              </div>
              {active && (
                <div className="ml-auto flex items-center gap-1.5 pt-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                  </span>
                  <span className="text-xs text-amber-400 font-medium">LIVE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Main ─────────────────────────
export default function TrackingView({ tr, initialNumber }: { tr: Translation; initialNumber?: string }) {
  const [input, setInput]     = useState(initialNumber ?? "");
  const [info, setInfo]       = useState<TrackingInfo | null>(initialNumber ? mockTrack(initialNumber) : null);
  const [notFound, setNotFound] = useState(false);

  const fetchReal = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/booking?id=${encodeURIComponent(id)}`);
      if (!res.ok) return false;
      const data = await res.json();

      let driver: DriverInfo | undefined;
      if (data.driver_lat != null && data.driver_lng != null) {
        // ETA: 平均30km/h想定
        const dest = ZONE_COORDS.chitose; // フォールバック。本来はbookingのzone座標を使う
        const distKm = haversineKm(data.driver_lat, data.driver_lng, dest.lat, dest.lng);
        driver = {
          lat: data.driver_lat,
          lng: data.driver_lng,
          status: data.driver_status ?? "heading",
          updatedAt: data.driver_updated_at
            ? new Date(data.driver_updated_at).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" })
            : "--:--",
          distanceKm: distKm,
          etaMin: Math.round((distKm / 30) * 60),
        };
      }

      const now = new Date();
      setInfo({
        trackingNumber: data.booking_id,
        status: (data.status as DeliveryStatus) ?? "confirmed",
        from: tr.track_from,
        to:   tr.track_to,
        eta:  new Date(now.getTime() + 2 * 3600 * 1000).toLocaleString("ja-JP", {
          month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
        }),
        updatedAt: now.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        driver,
      });
      setNotFound(false);
      return true;
    } catch {
      return false;
    }
  }, [tr]);

  async function handleTrack() {
    const id = input.trim().toUpperCase();
    const ok = await fetchReal(id);
    if (!ok) {
      const mock = mockTrack(id);
      if (mock) { setInfo(mock); setNotFound(false); }
      else      { setInfo(null); setNotFound(true); }
    }
  }

  // バックエンドからのデータのみポーリング（モックは不要）
  useEffect(() => {
    if (!info?.trackingNumber?.startsWith("KRX-")) return;
    if (info.status === "delivered") return;
    const id = setInterval(() => fetchReal(info.trackingNumber), 10_000);
    return () => clearInterval(id);
  }, [info?.trackingNumber, info?.status, fetchReal]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">{tr.track_title}</h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          placeholder={tr.track_input_placeholder}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 font-mono focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          type="button"
          onClick={handleTrack}
          className="px-5 py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
        >
          {tr.track_btn}
        </button>
      </div>

      {notFound && (
        <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
          {tr.track_not_found}
        </div>
      )}

      {info && (
        <div className="space-y-4">
          <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-mono">{info.trackingNumber}</p>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                info.status === "delivered"
                  ? "bg-green-950 text-green-400 border border-green-800"
                  : "bg-amber-950 text-amber-400 border border-amber-800"
              }`}>
                {info.status === "confirmed" || info.status === "booked" ? tr.track_status_booked :
                 info.status === "pickup"    ? tr.track_status_pickup    :
                 info.status === "transit"   ? tr.track_status_transit   :
                 tr.track_status_delivered}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-[10px] text-gray-600 mb-1">{tr.track_from}</p>
                <p className="text-xs text-gray-300 font-medium">{info.from}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-[10px] text-gray-600 mb-1">{tr.track_to}</p>
                <p className="text-xs text-gray-300 font-medium">{info.to}</p>
              </div>
            </div>

            {info.status !== "delivered" && (
              <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-800/60 rounded-xl px-4 py-3">
                <span className="text-xl">🕐</span>
                <div>
                  <p className="text-[10px] text-amber-500">{tr.track_eta}</p>
                  <p className="text-sm font-bold text-amber-300">{info.eta}</p>
                </div>
              </div>
            )}
          </div>

          {/* ドライバーGPS */}
          {info.driver && <DriverCard driver={info.driver} tr={tr} />}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <Timeline info={info} tr={tr} />
          </div>
        </div>
      )}

      {!info && !notFound && (
        <div className="text-center py-12 text-gray-700">
          <p className="text-5xl mb-3">📍</p>
          <p className="text-sm">{tr.track_input_label}</p>
        </div>
      )}
    </div>
  );
}
