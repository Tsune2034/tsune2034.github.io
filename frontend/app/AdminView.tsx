"use client";

import { useState, useEffect, useCallback } from "react";

const ADMIN_PIN = "0000"; // 本番前に変更すること

type BookingRow = {
  booking_id: string;
  status: string;
  name: string;
  zone: string;
  plan: string;
  total_amount: number;
  pay_method: string;
  created_at: string;
};

type DriverRow = {
  id: number;
  name: string;
  phone: string;
  vehicle: string;
  area: string;
  style: string;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  confirmed:  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  pickup:     "bg-amber-500/20 text-amber-300 border-amber-500/30",
  transit:    "bg-purple-500/20 text-purple-300 border-purple-500/30",
  delivered:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "予約済",
  pickup:    "集荷中",
  transit:   "配送中",
  delivered: "完了",
};

const ZONE_LABEL: Record<string, string> = {
  chitose: "千歳",
  sapporo: "札幌",
  otaru:   "小樽",
  furano:  "富良野",
};

const PAY_LABEL: Record<string, string> = {
  credit: "💳",
  jpyc:   "JPYC",
  usdc:   "USDC",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ───────────────────────── Stats ─────────────────────────
function StatsRow({ bookings, drivers }: { bookings: BookingRow[]; drivers: DriverRow[] }) {
  const total     = bookings.length;
  const delivered = bookings.filter((b) => b.status === "delivered").length;
  const revenue   = bookings.filter((b) => b.status === "delivered").reduce((s, b) => s + b.total_amount, 0);
  const active    = drivers.length;

  const cards = [
    { label: "総予約数",   value: total,                       color: "text-white",        icon: "📦" },
    { label: "配送完了",   value: delivered,                   color: "text-emerald-400",  icon: "✅" },
    { label: "売上合計",   value: `¥${revenue.toLocaleString()}`, color: "text-amber-400", icon: "💴" },
    { label: "登録ドライバー", value: active,                  color: "text-sky-400",      icon: "🚐" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-[11px] text-gray-400 mb-1">{c.icon} {c.label}</p>
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Bookings Tab ─────────────────────────
function BookingsTab({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return <p className="text-center text-gray-500 py-12 text-sm">予約データがありません</p>;
  }
  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.booking_id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-amber-300">{b.booking_id}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[b.status] ?? "bg-gray-700 text-gray-400 border-gray-600"}`}>
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
            </div>
            <p className="text-xs text-gray-300 truncate">{b.name}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {ZONE_LABEL[b.zone] ?? b.zone} · {b.plan} · {PAY_LABEL[b.pay_method] ?? b.pay_method}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-white">¥{b.total_amount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(b.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Drivers Tab ─────────────────────────
function DriversTab({ drivers }: { drivers: DriverRow[] }) {
  if (drivers.length === 0) {
    return <p className="text-center text-gray-500 py-12 text-sm">登録ドライバーがいません</p>;
  }

  // 稼働スタイル別の簡易評価（仮）
  const styleLabel: Record<string, string> = { full: "専業", side: "副業" };

  return (
    <div className="space-y-2">
      {drivers.map((d) => (
        <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">🚐 ドライバー登録情報</p>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">👤 {d.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">📞 {d.phone}</p>
            </div>
            <p className="text-[10px] text-gray-500">{formatDate(d.created_at)}</p>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {d.vehicle && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-300">
                🚐 {d.vehicle}
              </span>
            )}
            {d.area && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300">
                📍 {d.area}
              </span>
            )}
            {d.style && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 border border-gray-500/25 text-gray-300">
                {styleLabel[d.style] ?? d.style}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── PIN Gate ─────────────────────────
function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onUnlock();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6">
      <div className="text-6xl">🔐</div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-white">管理者専用</h2>
        <p className="text-xs text-gray-500 mt-1">Admin Access Only</p>
      </div>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Admin PIN"
          className={`w-full text-center text-2xl font-mono tracking-[0.5em] bg-slate-800 border rounded-xl px-4 py-3 text-gray-100 focus:outline-none transition-colors ${
            error ? "border-red-500" : "border-slate-600 focus:border-amber-500"
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

// ───────────────────────── Main ─────────────────────────
export default function AdminView() {
  const [unlocked, setUnlocked]     = useState(false);
  const [tab, setTab]               = useState<"bookings" | "drivers">("bookings");
  const [bookings, setBookings]     = useState<BookingRow[]>([]);
  const [drivers, setDrivers]       = useState<DriverRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, dRes] = await Promise.all([
        fetch("/api/admin?type=bookings"),
        fetch("/api/admin?type=drivers"),
      ]);
      if (bRes.ok) setBookings(await bRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      setLastFetched(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) fetchData();
  }, [unlocked, fetchData]);

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">管理ダッシュボード</h2>
          {lastFetched && (
            <p className="text-[10px] text-gray-600 mt-0.5">
              最終更新: {lastFetched.toLocaleTimeString("ja-JP")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          >
            {loading ? "読込中…" : "↻ 更新"}
          </button>
          <button
            type="button"
            onClick={() => setUnlocked(false)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow bookings={bookings} drivers={drivers} />

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("bookings")}
          className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
            tab === "bookings"
              ? "border-amber-500 bg-amber-500/10 text-amber-300"
              : "border-white/10 text-gray-500 hover:border-white/20"
          }`}
        >
          📦 予約一覧 ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("drivers")}
          className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
            tab === "drivers"
              ? "border-sky-500 bg-sky-500/10 text-sky-300"
              : "border-white/10 text-gray-500 hover:border-white/20"
          }`}
        >
          🚐 ドライバー ({drivers.length})
        </button>
      </div>

      {/* Content */}
      {tab === "bookings" ? (
        <BookingsTab bookings={bookings} />
      ) : (
        <DriversTab drivers={drivers} />
      )}
    </div>
  );
}
