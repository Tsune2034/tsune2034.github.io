"use client";

import { useState, useEffect, useRef } from "react";

// ───────────────────────── 定数 ─────────────────────────
const PLAYER_PIN = "1234"; // 本番前に変更すること
const BASE_INTERVAL_MS = 15_000; // 基本15秒
const TRAIN_SKIP = 4;            // 電車中は4ティック=60秒に1回送信

type PlayerStatus = "at_airport" | "on_train" | "walking" | "done";

const STATUS_CONFIG: Record<PlayerStatus, {
  label: string;
  color: string;
  next?: PlayerStatus;
}> = {
  at_airport: { label: "✈️ 空港で荷物受け取り中", color: "bg-sky-500",    next: "on_train" },
  on_train:   { label: "🚃 電車乗車中",            color: "bg-purple-500", next: "walking"  },
  walking:    { label: "🚶 ホテルへ徒歩中",         color: "bg-amber-500",  next: "done"     },
  done:       { label: "✅ 配達完了",               color: "bg-gray-600"                     },
};

const STEPS: PlayerStatus[] = ["at_airport", "on_train", "walking", "done"];
const STEP_LABELS = ["空港", "電車", "徒歩", "完了"];

interface ActiveDelivery {
  bookingId: string;
  status: PlayerStatus;
  gpsActive: boolean;
  lastLat: number;
  lastLng: number;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

// ───────────────────────── API ─────────────────────────
async function pushLocation(bookingId: string, lat: number, lng: number, status: string) {
  try {
    await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, driver_status: status }),
    });
  } catch { /* GPS送信失敗は無視（次回リトライ） */ }
}

async function pushStatus(bookingId: string, status: string) {
  try {
    await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driver_status: status }),
    });
  } catch { /* 失敗は無視 */ }
}

// プレイヤーGPS位置をバックエンドに送信（AIマッチング用）
async function pushPlayerLocation(playerId: number, lat: number, lng: number, isAvailable: boolean) {
  if (!BACKEND || !playerId) return;
  try {
    await fetch(`${BACKEND}/players/${playerId}/location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, is_available: isAvailable }),
    });
  } catch { /* 失敗は無視 */ }
}

// AIからアサインされた予約を取得
async function fetchAssignments(playerId: number): Promise<Assignment[]> {
  if (!BACKEND || !playerId) return [];
  try {
    const res = await fetch(`${BACKEND}/players/${playerId}/assignments`);
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

interface Assignment {
  booking_id: string;
  status: string;
  pickup_location: string;
  hotel_name: string;
  plan: string;
  extra_bags: number;
  total_amount: number;
  dispatch_reason: string;
  dispatched_at: string | null;
}

// ───────────────────────── PIN Gate ─────────────────────────
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === PLAYER_PIN) {
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
        <h2 className="text-lg font-bold text-white">プレイヤー専用</h2>
        <p className="text-xs text-gray-500 mt-1">Player Access Only</p>
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
            error ? "border-red-500" : "border-gray-700 focus:border-green-500"
          }`}
        />
        {error && <p className="text-xs text-red-400 text-center">PINが違います</p>}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-green-500 text-gray-950 font-semibold text-sm hover:bg-green-400 transition-colors"
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
  const currentIdx = STEPS.indexOf(delivery.status);
  const pct = (currentIdx / (STEPS.length - 1)) * 100;
  const isOffline = delivery.gpsActive && delivery.lastLat === 0;
  const isOnTrain = delivery.status === "on_train";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white font-mono">{delivery.bookingId}</p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* 路線進捗バー */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`text-[9px] font-semibold transition-colors ${
                i < currentIdx ? "text-green-500" :
                i === currentIdx ? "text-green-400" :
                "text-gray-700"
              }`}
            >
              {STEP_LABELS[i]}
            </span>
          ))}
        </div>
        <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-0.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= currentIdx ? "bg-green-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 電車中のヒント */}
      {isOnTrain && (
        <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl px-3 py-2">
          <p className="text-[10px] text-purple-400">
            電車中モード: GPS送信を60秒ごとに削減（電池節約）
          </p>
          <p className="text-[10px] text-purple-600 mt-0.5">
            地下鉄圏外時は最終位置を保持し、電波回復後に自動送信
          </p>
        </div>
      )}

      {/* GPS状態 */}
      <button
        type="button"
        onClick={() => onToggleGps(delivery.bookingId)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
          delivery.gpsActive
            ? isOffline
              ? "border-amber-700 bg-amber-950/30"
              : "border-green-700 bg-green-950/30"
            : "border-gray-700 bg-gray-800/50"
        }`}
      >
        <div className="relative flex-shrink-0">
          {delivery.gpsActive ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isOffline ? "bg-amber-400" : "bg-green-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isOffline ? "bg-amber-500" : "bg-green-500"
              }`} />
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className={`text-xs font-semibold ${
            delivery.gpsActive
              ? isOffline ? "text-amber-400" : "text-green-400"
              : "text-gray-400"
          }`}>
            {delivery.gpsActive
              ? isOffline
                ? "圏外中 — 最終位置を保持中"
                : isOnTrain
                  ? "GPS送信中（60秒ごと）"
                  : "GPS送信中（15秒ごと）"
              : "GPS追跡を開始"}
          </p>
          {delivery.gpsActive && isOffline && (
            <p className="text-[10px] text-amber-600">電波が戻り次第自動送信します</p>
          )}
        </div>
        {delivery.gpsActive && (
          <span className="text-[10px] text-gray-600">タップで停止</span>
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

// ───────────────────────── Assignment Card ─────────────────────────
function AssignmentCard({ a }: { a: Assignment }) {
  const planLabel = a.plan === "solo" ? "1個" : a.plan === "pair" ? "2個" : "3個〜";
  return (
    <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="text-xs font-bold text-emerald-400">AI からアサイン</p>
        </div>
        <p className="text-xs font-mono text-gray-400">{a.booking_id}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-900 rounded-xl p-2">
          <p className="text-[9px] text-gray-600 mb-0.5">集荷</p>
          <p className="text-gray-300 font-medium leading-tight">{a.pickup_location || "—"}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-2">
          <p className="text-[9px] text-gray-600 mb-0.5">配達先</p>
          <p className="text-gray-300 font-medium leading-tight">{a.hotel_name || "—"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>荷物: {planLabel}{a.extra_bags > 0 ? ` +${a.extra_bags}` : ""}</span>
        <span className="text-emerald-400 font-bold">¥{a.total_amount.toLocaleString()}</span>
      </div>
      {a.dispatch_reason && (
        <p className="text-[10px] text-gray-600 italic">AI理由: {a.dispatch_reason}</p>
      )}
    </div>
  );
}

// ───────────────────────── Main ─────────────────────────
export default function PlayerView() {
  const [unlocked, setUnlocked] = useState(false);
  const [bookingInput, setBookingInput] = useState("");
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [playerId, setPlayerId] = useState<number>(0);
  const [playerIdInput, setPlayerIdInput] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [standbyMode, setStandbyMode] = useState(false);

  // GPS管理
  const watchIds      = useRef<Map<string, number>>(new Map());
  const intervals     = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const lastPos       = useRef<Map<string, { lat: number; lng: number } | null>>(new Map());
  const tickCounts    = useRef<Map<string, number>>(new Map());
  const latestStatus  = useRef<Map<string, PlayerStatus>>(new Map());
  const standbyWatchId = useRef<number | null>(null);
  const standbyInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      watchIds.current.forEach((id) => navigator.geolocation?.clearWatch(id));
      intervals.current.forEach((id) => clearInterval(id));
      if (standbyWatchId.current !== null) navigator.geolocation?.clearWatch(standbyWatchId.current);
      if (standbyInterval.current !== null) clearInterval(standbyInterval.current);
    };
  }, []);

  // AIアサイン ポーリング（10秒ごと）
  useEffect(() => {
    if (!playerId) return;
    fetchAssignments(playerId).then(setAssignments);
    const iv = setInterval(() => fetchAssignments(playerId).then(setAssignments), 10_000);
    return () => clearInterval(iv);
  }, [playerId]);

  // 待機モード: GPS位置をバックエンドに送信してマッチング候補に入る
  function toggleStandby() {
    if (standbyMode) {
      if (standbyWatchId.current !== null) navigator.geolocation?.clearWatch(standbyWatchId.current);
      if (standbyInterval.current !== null) clearInterval(standbyInterval.current);
      standbyWatchId.current = null;
      standbyInterval.current = null;
      if (playerId) pushPlayerLocation(playerId, 0, 0, false);
      setStandbyMode(false);
    } else {
      if (!navigator.geolocation) { alert("GPSに対応していません"); return; }
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          if (playerId) pushPlayerLocation(playerId, pos.coords.latitude, pos.coords.longitude, true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10_000 },
      );
      standbyWatchId.current = wid;
      setStandbyMode(true);
    }
  }

  function addDelivery() {
    const id = bookingInput.trim().toUpperCase();
    if (!id.startsWith("KRX-") || deliveries.find((d) => d.bookingId === id)) return;
    latestStatus.current.set(id, "at_airport");
    lastPos.current.set(id, null);
    tickCounts.current.set(id, 0);
    setDeliveries((prev) => [...prev, {
      bookingId: id,
      status: "at_airport",
      gpsActive: false,
      lastLat: 0,
      lastLng: 0,
    }]);
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
      setDeliveries((prev) => prev.map((d) =>
        d.bookingId === bookingId ? { ...d, gpsActive: false } : d
      ));
    } else {
      // GPS開始
      if (!navigator.geolocation) {
        alert("このデバイスはGPSに対応していません");
        return;
      }

      lastPos.current.set(bookingId, null);
      tickCounts.current.set(bookingId, 0);

      // watchPosition: 位置が取れたらキャッシュ（圏外時はそのまま保持）
      const wid = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          lastPos.current.set(bookingId, newPos);
          setDeliveries((prev) => prev.map((d) =>
            d.bookingId === bookingId
              ? { ...d, lastLat: pos.coords.latitude, lastLng: pos.coords.longitude }
              : d
          ));
        },
        () => { /* 圏外: 最終位置はそのまま保持 */ },
        { enableHighAccuracy: true, timeout: 10_000 },
      );

      // 15秒ティック: 電車中は4ティック=60秒に1回送信
      const iid = setInterval(() => {
        const status = latestStatus.current.get(bookingId) ?? "at_airport";
        const pos    = lastPos.current.get(bookingId);
        const tick   = (tickCounts.current.get(bookingId) ?? 0) + 1;
        tickCounts.current.set(bookingId, tick);

        // 電車中は60秒ごと（4ティックに1回）
        if (status === "on_train" && tick % TRAIN_SKIP !== 0) return;

        if (pos) {
          pushLocation(bookingId, pos.lat, pos.lng, status);
        } else {
          // 圏外: 位置なし、ステータスのみ送信
          pushStatus(bookingId, status);
        }
      }, BASE_INTERVAL_MS);

      watchIds.current.set(bookingId, wid);
      intervals.current.set(bookingId, iid);

      setDeliveries((prev) => prev.map((d) =>
        d.bookingId === bookingId ? { ...d, gpsActive: true } : d
      ));
    }
  }

  function statusNext(bookingId: string) {
    setDeliveries((prev) => prev.map((d) => {
      if (d.bookingId !== bookingId) return d;
      const next = STATUS_CONFIG[d.status].next;
      if (!next) return d;

      // latestStatus refを更新（interval callbackが参照）
      latestStatus.current.set(bookingId, next);

      const pos = lastPos.current.get(bookingId);
      if (pos) {
        pushLocation(bookingId, pos.lat, pos.lng, next);
      } else {
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
    lastPos.current.delete(bookingId);
    latestStatus.current.delete(bookingId);
    tickCounts.current.delete(bookingId);
    setDeliveries((prev) => prev.filter((d) => d.bookingId !== bookingId));
  }

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">🧳 プレイヤー管理</h2>
          <p className="text-xs text-gray-500 mt-0.5">ハンドキャリー GPS追跡</p>
        </div>
        <button
          type="button"
          onClick={() => setUnlocked(false)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* プレイヤーID入力（AIマッチング用） */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-400">プレイヤーID（AI自動アサイン受信用）</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={playerIdInput}
            onChange={(e) => setPlayerIdInput(e.target.value)}
            placeholder="登録ID（例: 1）"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-green-500"
          />
          <button
            type="button"
            onClick={() => setPlayerId(Number(playerIdInput))}
            className="px-3 py-2 rounded-xl bg-gray-700 text-gray-200 text-xs font-semibold hover:bg-gray-600 transition-colors"
          >
            設定
          </button>
        </div>
        {playerId > 0 && (
          <p className="text-[10px] text-green-500">ID:{playerId} でアサイン受信中（10秒ごと）</p>
        )}
      </div>

      {/* 待機モード（AIマッチング候補に入る） */}
      <button
        type="button"
        onClick={toggleStandby}
        disabled={!playerId}
        className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl border font-semibold text-sm transition-all ${
          standbyMode
            ? "border-emerald-600 bg-emerald-950/40 text-emerald-400"
            : playerId
              ? "border-gray-700 bg-gray-900 text-gray-400 hover:border-green-700"
              : "border-gray-800 bg-gray-900/50 text-gray-700 cursor-not-allowed"
        }`}
      >
        {standbyMode ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            空港待機中 — AI マッチング候補（タップで終了）
          </>
        ) : (
          <>🧳 空港待機モードを開始（AIが自動アサイン）</>
        )}
      </button>

      {/* AIアサイン一覧 */}
      {assignments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-emerald-400">AIアサイン ({assignments.length}件)</p>
          {assignments.map((a) => (
            <AssignmentCard key={a.booking_id} a={a} />
          ))}
        </div>
      )}

      {/* 説明バナー */}
      <div className="bg-green-950/30 border border-green-800/40 rounded-xl px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-green-400">GPS送信ルール</p>
        <p className="text-[11px] text-green-600">徒歩中 / 空港内: 15秒ごと</p>
        <p className="text-[11px] text-green-600">電車乗車中: 60秒ごと（電池節約モード）</p>
        <p className="text-[11px] text-green-600">地下鉄圏外: 最終位置を保持し電波回復後に自動送信</p>
      </div>

      {/* 予約追加 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={bookingInput}
          onChange={(e) => setBookingInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addDelivery()}
          placeholder="KRX-XXXXXX"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 font-mono focus:outline-none focus:border-green-500 transition-colors"
        />
        <button
          type="button"
          onClick={addDelivery}
          className="px-4 py-2.5 rounded-xl bg-green-500 text-gray-950 font-semibold text-sm hover:bg-green-400 transition-colors"
        >
          追加
        </button>
      </div>

      {/* 配送一覧 */}
      {deliveries.length === 0 ? (
        <div className="text-center py-8 text-gray-700">
          <p className="text-4xl mb-3">🧳</p>
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
