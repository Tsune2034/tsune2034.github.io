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

type PlayerRow = {
  id: number;
  name: string;
  email: string;
  route: string;
  rank: string;
  trust_score: number;
  avg_rating: number;
  completed_jobs: number;
  id_verified: boolean;
  created_at: string;
};

type MonitorAlert = {
  booking_id?: string;
  type: string;
  msg: string;
  stale_min?: number;
  player_status?: string;
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
function StatsRow({ bookings, drivers, players }: { bookings: BookingRow[]; drivers: DriverRow[]; players: PlayerRow[] }) {
  const total     = bookings.length;
  const delivered = bookings.filter((b) => b.status === "delivered").length;
  const active    = bookings.filter((b) => !["delivered", "cancelled"].includes(b.status)).length;
  const revenue   = bookings.filter((b) => b.status === "delivered").reduce((s, b) => s + b.total_amount, 0);

  const cards = [
    { label: "総予約数",      value: total,                          color: "text-white",       icon: "📦" },
    { label: "配送完了",      value: delivered,                      color: "text-emerald-400", icon: "✅" },
    { label: "稼働中",        value: active,                         color: "text-amber-400",   icon: "🔄" },
    { label: "売上合計",      value: `¥${revenue.toLocaleString()}`, color: "text-amber-300",   icon: "💴" },
    { label: "登録ドライバー", value: drivers.length,                 color: "text-sky-400",     icon: "🚐" },
    { label: "プレイヤー",    value: players.length,                  color: "text-green-400",   icon: "🧳" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((c) => (
        <div key={c.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 mb-1">{c.icon} {c.label}</p>
          <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
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

// ───────────────────────── Players Tab ─────────────────────────
const RANK_CONFIG: Record<string, { label: string; color: string }> = {
  new:     { label: "New",     color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  trusted: { label: "Trusted", color: "bg-sky-500/20 text-sky-300 border-sky-500/30"   },
  elite:   { label: "Elite",   color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

function PlayersTab({ players }: { players: PlayerRow[] }) {
  if (players.length === 0) {
    return <p className="text-center text-gray-500 py-12 text-sm">登録プレイヤーがいません</p>;
  }
  return (
    <div className="space-y-2">
      {players.map((p) => {
        const rank = RANK_CONFIG[p.rank] ?? RANK_CONFIG.new;
        return (
          <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-white truncate">{p.name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${rank.color}`}>
                    {rank.label}
                  </span>
                  {p.id_verified && (
                    <span className="text-[9px] text-emerald-400 flex-shrink-0">✓ 本人確認済</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 truncate">{p.email}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">ルート: {p.route} · 完了: {p.completed_jobs}件</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-amber-300">
                  ★ {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : "—"}
                </p>
                <p className="text-[10px] text-gray-500">スコア {p.trust_score.toFixed(0)}</p>
              </div>
            </div>
            {/* Trust score bar */}
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, p.trust_score)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── AI Ops Tab ─────────────────────────
function AiOpsTab() {
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  async function runMonitor() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin?type=monitor");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        setLastRun(new Date());
      }
    } finally {
      setRunning(false);
    }
  }

  const ALERT_COLOR: Record<string, string> = {
    auto_completed: "border-emerald-700/50 bg-emerald-950/30 text-emerald-400",
    gps_stale:      "border-amber-700/50 bg-amber-950/30 text-amber-400",
    ai_summary:     "border-sky-700/50 bg-sky-950/30 text-sky-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">AI Monitor</p>
          <p className="text-[10px] text-gray-500">通常は30秒ごとに自動実行</p>
        </div>
        <button
          type="button"
          onClick={runMonitor}
          disabled={running}
          className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors disabled:opacity-50"
        >
          {running ? "実行中…" : "手動実行"}
        </button>
      </div>

      {lastRun && (
        <p className="text-[10px] text-gray-600">
          最終実行: {lastRun.toLocaleTimeString("ja-JP")} · {alerts.length}件のアラート
        </p>
      )}

      {alerts.length === 0 && lastRun && (
        <div className="text-center py-8 text-gray-600">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm">異常なし</p>
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className={`rounded-xl border px-4 py-3 ${ALERT_COLOR[a.type] ?? "border-gray-700 bg-gray-800/50 text-gray-400"}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold">{a.type}</p>
              {a.booking_id && (
                <p className="text-[10px] font-mono text-gray-500">{a.booking_id}</p>
              )}
            </div>
            <p className="text-xs mt-1 leading-relaxed">{a.msg}</p>
            {a.stale_min != null && (
              <p className="text-[10px] mt-1 opacity-70">途絶: {a.stale_min}分</p>
            )}
          </div>
        ))}
      </div>

      {/* 説明 */}
      <div className="border-t border-gray-800 pt-4 space-y-1">
        <p className="text-[10px] text-gray-600 font-semibold">自動実行内容</p>
        <p className="text-[10px] text-gray-700">• GPS更新が15分途絶 → アラート生成</p>
        <p className="text-[10px] text-gray-700">• driver_status=done → 自動完了処理</p>
        <p className="text-[10px] text-gray-700">• 異常検知時 → Claude がサマリー生成</p>
      </div>
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
  const [tab, setTab]               = useState<"bookings" | "drivers" | "players" | "ai">("bookings");
  const [bookings, setBookings]     = useState<BookingRow[]>([]);
  const [drivers, setDrivers]       = useState<DriverRow[]>([]);
  const [players, setPlayers]       = useState<PlayerRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, dRes, pRes] = await Promise.all([
        fetch("/api/admin?type=bookings"),
        fetch("/api/admin?type=drivers"),
        fetch("/api/admin?type=players"),
      ]);
      if (bRes.ok) setBookings(await bRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      if (pRes.ok) setPlayers(await pRes.json());
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
      <StatsRow bookings={bookings} drivers={drivers} players={players} />

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {([
          { key: "bookings", icon: "📦", label: `予約(${bookings.length})`,  active: "border-amber-500 bg-amber-500/10 text-amber-300" },
          { key: "drivers",  icon: "🚐", label: `運転(${drivers.length})`,   active: "border-sky-500 bg-sky-500/10 text-sky-300"   },
          { key: "players",  icon: "🧳", label: `PL(${players.length})`,     active: "border-green-500 bg-green-500/10 text-green-300" },
          { key: "ai",       icon: "🤖", label: "AI Ops",                     active: "border-purple-500 bg-purple-500/10 text-purple-300" },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`py-2 rounded-xl border text-[10px] font-semibold transition-all ${
              tab === t.key ? t.active : "border-white/10 text-gray-500 hover:border-white/20"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "bookings" ? <BookingsTab bookings={bookings} /> :
       tab === "drivers"  ? <DriversTab  drivers={drivers}   /> :
       tab === "players"  ? <PlayersTab  players={players}   /> :
       <AiOpsTab />}
    </div>
  );
}
