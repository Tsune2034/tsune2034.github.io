"use client";

import { useState, useEffect, useRef } from "react";
import type { Translation } from "./i18n";

// ───────────────────────── 定数 ─────────────────────────
const DRIVER_PIN = "1234"; // 本番前に変更すること
const GPS_INTERVAL_MS = 30_000; // 30秒ごとに送信

type DriverStatus = "heading" | "nearby" | "arrived" | "done";

const STATUS_CONFIG: Record<DriverStatus, { label: string; color: string; next?: DriverStatus }> = {
  heading: { label: "🚐 向かっています",   color: "bg-sky-500",   next: "nearby"  },
  nearby:  { label: "📍 近くにいます",      color: "bg-amber-500", next: "arrived" },
  arrived: { label: "📦 荷物を受け取り中", color: "bg-green-500", next: "done"    },
  done:    { label: "✅ 配達完了",          color: "bg-gray-600"                   },
};

interface ActiveDelivery {
  bookingId: string;
  status: DriverStatus;
  gpsActive: boolean;
}

// ───────────────────────── GPS・ステータス送信 ─────────────────────────
async function pushLocation(bookingId: string, lat: number, lng: number, driverStatus: string) {
  try {
    await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, driver_status: driverStatus }),
    });
  } catch {
    // GPS送信失敗は無視（次回リトライ）
  }
}

// ステータスのみ送信（GPS OFF時も必ず呼ぶ）
async function pushStatus(bookingId: string, driverStatus: string) {
  try {
    await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_status: driverStatus }),
    });
  } catch {
    // 失敗は無視
  }
}

// ───────────────────────── PIN Gate ─────────────────────────
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === DRIVER_PIN) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
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
          className="w-full py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
        >
          ログイン
        </button>
      </form>
    </div>
  );
}

// ───────────────────────── Delivery Card ─────────────────────────
function DeliveryCard({
  delivery,
  onStatusNext,
  onToggleGps,
}: {
  delivery: ActiveDelivery;
  onStatusNext: (id: string) => void;
  onToggleGps: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[delivery.status];
  const nextCfg = cfg.next ? STATUS_CONFIG[cfg.next] : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white font-mono">{delivery.bookingId}</p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

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
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
            </>
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
    </div>
  );
}

// ───────────────────────── Main ─────────────────────────
export default function DriverView({ tr }: { tr: Translation }) {
  const [unlocked, setUnlocked] = useState(false);
  const [bookingInput, setBookingInput] = useState("");
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const watchIds = useRef<Map<string, number>>(new Map());
  const intervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // コンポーネントアンマウント時にGPS停止
  useEffect(() => {
    return () => {
      watchIds.current.forEach((id) => navigator.geolocation?.clearWatch(id));
      intervals.current.forEach((id) => clearInterval(id));
    };
  }, []);

  function addDelivery() {
    const id = bookingInput.trim().toUpperCase();
    if (!id.startsWith("KRX-") || deliveries.find((d) => d.bookingId === id)) return;
    setDeliveries((prev) => [...prev, { bookingId: id, status: "heading", gpsActive: false }]);
    setBookingInput("");
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
        const d = deliveries.find((x) => x.bookingId === bookingId);
        pushLocation(bookingId, lastLat, lastLng, d?.status ?? "heading");
      };

      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          lastLat = pos.coords.latitude;
          lastLng = pos.coords.longitude;
          pushLocation(bookingId, lastLat, lastLng, delivery.status);
        },
        () => {},
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
          (pos) => pushLocation(bookingId, pos.coords.latitude, pos.coords.longitude, next),
          () => pushStatus(bookingId, next), // GPS取得失敗時はステータスのみ
        );
      } else {
        // GPS OFF でもステータスは必ず送信
        pushStatus(bookingId, next);
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
        <div className="text-center py-12 text-gray-700">
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

    </div>
  );
}
