"use client";

import { useState, useEffect, useCallback } from "react";


type BookingRow = {
  booking_id: string;
  status: string;
  name: string;
  zone: string;
  plan: string;
  total_amount: number;
  pay_method: string;
  created_at: string;
  pickup_date: string;
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
function AiOpsTab({ adminPin }: { adminPin: string }) {
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  async function runMonitor() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin?type=monitor", {
        headers: { "X-Admin-Pin": adminPin },
      });
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

// ───────────────────────── GPS Stats Tab ─────────────────────────
const BAND_LABEL: Record<string, string> = {
  morning:  "朝 6-9時",
  daytime:  "昼 10-16時",
  evening:  "夜 17-23時",
  midnight: "深夜 0-5時",
};

function SalesTab({ bookings }: { bookings: BookingRow[] }) {
  const paid = bookings.filter((b) => !["cancelled"].includes(b.status));

  // 日次集計（直近7日）
  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  paid.forEach((b) => {
    const day = b.pickup_date?.slice(0, 10) ?? b.created_at?.slice(0, 10) ?? "";
    if (day in dayMap) dayMap[day] = (dayMap[day] ?? 0) + b.total_amount;
  });
  const days = Object.entries(dayMap);
  const maxAmt = Math.max(...days.map(([, v]) => v), 1);

  const totalRevenue = paid.reduce((s, b) => s + b.total_amount, 0);
  const avgOrder     = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;

  // プラン別
  const planCount: Record<string, number> = {};
  paid.forEach((b) => { planCount[b.plan] = (planCount[b.plan] ?? 0) + 1; });

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "総売上", value: `¥${totalRevenue.toLocaleString()}` },
          { label: "予約件数", value: `${paid.length}件` },
          { label: "平均単価", value: `¥${avgOrder.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-base font-black text-white">{value}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* 棒グラフ（直近7日）*/}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <p className="text-xs font-bold text-white mb-3">直近7日 売上</p>
        <div className="flex items-end gap-1.5 h-24">
          {days.map(([day, amt]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-pink-500/70 rounded-t-sm transition-all"
                style={{ height: `${Math.round((amt / maxAmt) * 80)}px`, minHeight: amt > 0 ? "4px" : "0" }}
              />
              <p className="text-[8px] text-gray-600">{day.slice(5)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* プラン別 */}
      {Object.keys(planCount).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-white">プラン別件数</p>
          {Object.entries(planCount).map(([plan, cnt]) => (
            <div key={plan} className="flex items-center justify-between">
              <span className="text-xs text-gray-400 capitalize">{plan}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-800 rounded-full h-1.5">
                  <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${Math.round((cnt / paid.length) * 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{cnt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GpsStatsTab() {
  const [data, setData] = useState<{
    hourly: { pickup_grid: string; dest_grid: string; route_type: string; hour_of_day: number; avg_actual_min: number; correction_factor: number; sample_count: number }[];
    bands:  { pickup_grid: string; dest_grid: string; route_type: string; time_band: string; avg_actual_min: number; correction_factor: number; sample_count: number }[];
    total_samples: number;
    band_routes: number;
  } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [injecting, setInjecting]   = useState(false);
  const [injectMsg, setInjectMsg]   = useState("");
  const [testForm, setTestForm]     = useState({ pickup: "成田空港 第1ターミナル", dest: "新宿駅西口", routeType: "highway" as "highway" | "local", zone: "narita" });
  const [creating, setCreating]     = useState(false);
  const [createMsg, setCreateMsg]   = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL ?? "";

  const loadStats = () => {
    fetch(`${API}/route-stats/summary`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, [API]); // eslint-disable-line react-hooks/exhaustive-deps

  async function injectTestRun(routeType: "highway" | "local") {
    setInjecting(true); setInjectMsg("");
    try {
      const res = await fetch(`${API}/debug/inject-gps-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_type: routeType }),
      });
      if (res.ok) {
        const d = await res.json();
        setInjectMsg(`✓ ${d.booking_id} [${routeType}] ${d.actual_min}分`);
        setTimeout(() => { setInjectMsg(""); loadStats(); }, 1500);
      } else {
        setInjectMsg("エラー: " + res.status);
      }
    } catch {
      setInjectMsg("接続エラー");
    } finally {
      setInjecting(false);
    }
  }

  async function createTestBooking() {
    setCreating(true); setCreateMsg("");
    const today = new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "テスト走行",
          email: "test@kairox.jp",
          phone: "000-0000-0000",
          locale: "ja",
          plan: "solo",
          extra_bags: 0,
          pickup_location: testForm.pickup,
          pickup_date: today,
          destination: "test",
          hotel_name: testForm.dest,
          zone: testForm.zone,
          pay_method: "credit",
          total_amount: 0,
          share_ride: false,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setCreateMsg(`✓ 予約ID: ${d.booking_id} — DriverViewで確認してください`);
      } else {
        const e = await res.json().catch(() => ({}));
        setCreateMsg("エラー: " + (e.detail ?? res.status));
      }
    } catch {
      setCreateMsg("接続エラー");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-center text-gray-500 py-12 text-sm">読込中…</p>;

  const totalSamples = data?.total_samples ?? 0;
  const bandRoutes   = data?.band_routes ?? 0;
  const progress     = Math.min(100, Math.round((totalSamples / 20) * 100));

  return (
    <div className="space-y-4">
      {/* 進捗バー */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white">GPS学習進捗</p>
          <span className="text-[10px] text-gray-500">{totalSamples} / 20件で時間帯別補正が起動</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${totalSamples >= 20 ? "bg-green-500" : "bg-amber-500"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-800/60 rounded-xl py-2">
            <p className="text-lg font-black text-white">{totalSamples}</p>
            <p className="text-[9px] text-gray-500">走行サンプル</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl py-2">
            <p className="text-lg font-black text-white">{bandRoutes}</p>
            <p className="text-[9px] text-gray-500">時間帯補正済みルート</p>
          </div>
          <div className={`rounded-xl py-2 ${totalSamples >= 20 ? "bg-green-500/20" : "bg-gray-800/60"}`}>
            <p className={`text-lg font-black ${totalSamples >= 20 ? "text-green-400" : "text-gray-600"}`}>
              {totalSamples >= 20 ? "ON" : "待機"}
            </p>
            <p className="text-[9px] text-gray-500">Phase4</p>
          </div>
        </div>

        {/* テスト投入 */}
        <div className="border-t border-gray-800 pt-3 space-y-2">
          <p className="text-[10px] text-gray-600 font-semibold">テストデータ投入（実走前の動作確認用）</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => injectTestRun("highway")}
              disabled={injecting}
              className="flex-1 py-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[11px] font-bold hover:bg-sky-500/25 transition-colors disabled:opacity-40"
            >
              🛣️ 高速テスト走行
            </button>
            <button
              type="button"
              onClick={() => injectTestRun("local")}
              disabled={injecting}
              className="flex-1 py-2 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-400 text-[11px] font-bold hover:bg-orange-500/25 transition-colors disabled:opacity-40"
            >
              🏘️ 一般道テスト走行
            </button>
          </div>
          {injectMsg && <p className="text-[10px] text-green-400 text-center">{injectMsg}</p>}
        </div>

        {/* 実走テスト予約 */}
        <div className="border-t border-gray-800 pt-3 space-y-2">
          <p className="text-[10px] text-gray-500 font-semibold">実走テスト予約（DriverViewでGPS走行）</p>
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={testForm.pickup}
                onChange={(e) => setTestForm((p) => ({ ...p, pickup: e.target.value }))}
                placeholder="出発地（例: 成田空港T1）"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setTestForm((p) => ({ ...p, pickup: `${lat.toFixed(5)},${lng.toFixed(5)}` }));
                  });
                }}
                className="px-2 py-1 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] font-bold hover:bg-sky-500/30 transition-colors flex-shrink-0"
              >
                📍現在地
              </button>
            </div>
            <div className="relative w-full">
              <input
                type="text"
                value={testForm.dest}
                onChange={async (e) => {
                  const v = e.target.value;
                  const zone =
                    /成田/.test(v)   ? "narita"  :
                    /千葉/.test(v)   ? "chiba"   :
                    /新宿/.test(v)   ? "shinjuku":
                    /東京|丸の内|銀座|浅草|渋谷|品川/.test(v) ? "tokyo" :
                    /札幌|大通|すすきの/.test(v) ? "sapporo":
                    /小樽/.test(v)   ? "otaru"   :
                    /富良野/.test(v) ? "furano"  :
                    /千歳/.test(v)   ? "chitose" :
                    null;
                  setTestForm((p) => ({ ...p, dest: v, ...(zone ? { zone } : {}) }));
                  // 〒番号 or 住所テキストでジオコード（/api/geocode 経由）
                  const zip = v.replace(/[〒\-ー－]/g, "").match(/^\d{7}$/);
                  const looksLikeAddress = /[都道府県市区町村]/.test(v) && v.length >= 5;
                  if (zip || looksLikeAddress) {
                    try {
                      const r = await fetch(`/api/geocode?q=${encodeURIComponent(v)}`);
                      const j = await r.json();
                      if (j.address && zip) {
                        const addr = j.address;
                        const autoZone =
                          /千葉/.test(addr)   ? "chiba"   :
                          /新宿/.test(addr)   ? "shinjuku":
                          /東京|港区|渋谷|品川/.test(addr) ? "tokyo" :
                          /成田/.test(addr)   ? "narita"  : null;
                        setTestForm((p) => ({ ...p, dest: addr, ...(autoZone ? { zone: autoZone } : {}) }));
                      }
                    } catch { /* ignore */ }
                  }
                }}
                placeholder="目的地（住所 or 〒1234567）"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 pr-8"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">〒</span>
            </div>
            <select
              value={testForm.zone}
              onChange={(e) => setTestForm((p) => ({ ...p, zone: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gray-500"
            >
              <option value="narita">成田空港</option>
              <option value="chiba">千葉市</option>
              <option value="tokyo">東京都心</option>
              <option value="shinjuku">新宿</option>
              <option value="chitose">新千歳</option>
              <option value="sapporo">札幌</option>
              <option value="otaru">小樽</option>
              <option value="furano">富良野</option>
            </select>
            <div className="flex gap-1.5">
              {(["highway", "local"] as const).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setTestForm((p) => ({ ...p, routeType: rt }))}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${testForm.routeType === rt ? "bg-sky-500/20 border-sky-500/50 text-sky-400" : "bg-gray-800 border-gray-700 text-gray-500"}`}
                >
                  {rt === "highway" ? "🛣️ 高速" : "🏘️ 一般道"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={createTestBooking}
              disabled={creating || !testForm.pickup || !testForm.dest}
              className="w-full py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-bold hover:bg-amber-500/25 transition-colors disabled:opacity-40"
            >
              {creating ? "作成中…" : "テスト予約を作成 →"}
            </button>
          </div>
          {createMsg && <p className="text-[10px] text-green-400 text-center">{createMsg}</p>}
        </div>
      </div>

      {/* 時間帯別補正テーブル */}
      {(data?.bands ?? []).length > 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-white">時間帯別補正係数（高精度）</p>
          <div className="space-y-1.5">
            {(data?.bands ?? []).map((b, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold text-gray-200">
                    {b.pickup_grid} → {b.dest_grid}
                  </p>
                  <p className="text-[9px] text-gray-600">
                    {BAND_LABEL[b.time_band] ?? b.time_band} · {b.route_type === "highway" ? "🛣️高速" : "🏘️一般道"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-400">×{b.correction_factor.toFixed(2)}</p>
                  <p className="text-[9px] text-gray-600">{b.avg_actual_min}分 · {b.sample_count}件</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center space-y-2">
          <p className="text-2xl">🛣️</p>
          <p className="text-xs font-semibold text-gray-400">時間帯別データなし</p>
          <p className="text-[10px] text-gray-600">走行データが20件蓄積すると自動で時間帯別補正が起動します</p>
        </div>
      )}

      {/* 時刻別データ（生データ） */}
      {(data?.hourly ?? []).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-white">時刻別生データ（上位10件）</p>
          <div className="space-y-1">
            {(data?.hourly ?? []).slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-gray-800/50">
                <span className="text-gray-400 font-mono">{r.pickup_grid}→{r.dest_grid}</span>
                <span className="text-gray-500">{r.hour_of_day}時 · {r.route_type === "highway" ? "高速" : "一般"}</span>
                <span className="text-amber-400 font-semibold">×{r.correction_factor.toFixed(2)}</span>
                <span className="text-gray-600">{r.sample_count}件</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ───────────────────────── PIN Gate ─────────────────────────
function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
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
        body: JSON.stringify({ pin, role: "admin" }),
      });
      const { ok } = await res.json();
      if (ok) {
        onUnlock(pin);
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
          disabled={loading}
          className="w-full py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

// ───────────────────────── Main ─────────────────────────
export default function AdminView() {
  const [unlocked, setUnlocked]     = useState(false);
  const [adminPin, setAdminPin]     = useState("");
  const [tab, setTab]               = useState<"bookings" | "drivers" | "players" | "ai" | "gps" | "sales">("bookings");
  const [bookings, setBookings]     = useState<BookingRow[]>([]);
  const [drivers, setDrivers]       = useState<DriverRow[]>([]);
  const [players, setPlayers]       = useState<PlayerRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async (pin: string) => {
    setLoading(true);
    const headers = { "X-Admin-Pin": pin };
    try {
      const [bRes, dRes, pRes] = await Promise.all([
        fetch("/api/admin?type=bookings", { headers }),
        fetch("/api/admin?type=drivers",  { headers }),
        fetch("/api/admin?type=players",  { headers }),
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
    if (unlocked && adminPin) fetchData(adminPin);
  }, [unlocked, adminPin, fetchData]);

  if (!unlocked) return <PinGate onUnlock={(pin) => { setAdminPin(pin); setUnlocked(true); }} />;

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
            onClick={() => fetchData(adminPin)}
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

      {/* 翌日KAIROX優先バナー */}
      {(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);
        const tomorrowBookings = bookings.filter(
          (b) => b.pickup_date?.startsWith(tomorrowStr) && !["delivered", "cancelled"].includes(b.status)
        );
        if (tomorrowBookings.length === 0) return null;
        return (
          <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl px-4 py-3 flex items-start gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <p className="text-sm font-bold text-amber-300">明日はKAIROX優先です</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                {tomorrowBookings.length}件の予約があります。下請けはお断りください。
              </p>
              <div className="mt-2 space-y-1">
                {tomorrowBookings.map((b) => (
                  <p key={b.booking_id} className="text-[10px] text-amber-300/70 font-mono">
                    {b.booking_id} · {b.name} · ¥{b.total_amount.toLocaleString()}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 mb-1">
        {([
          { key: "bookings", icon: "📦", label: `予約(${bookings.length})`,  active: "border-amber-500 bg-amber-500/10 text-amber-300" },
          { key: "drivers",  icon: "🚐", label: `運転(${drivers.length})`,   active: "border-sky-500 bg-sky-500/10 text-sky-300"   },
          { key: "players",  icon: "🧳", label: `PL(${players.length})`,     active: "border-green-500 bg-green-500/10 text-green-300" },
          { key: "sales",    icon: "💴", label: "売上",                       active: "border-pink-500 bg-pink-500/10 text-pink-300"  },
          { key: "ai",       icon: "🤖", label: "AI Ops",                     active: "border-purple-500 bg-purple-500/10 text-purple-300" },
          { key: "gps",      icon: "🛰️", label: "GPS学習",                   active: "border-orange-500 bg-orange-500/10 text-orange-300" },
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
       tab === "sales"    ? <SalesTab    bookings={bookings} /> :
       tab === "gps"      ? <GpsStatsTab /> :
       <AiOpsTab adminPin={adminPin} />}
    </div>
  );
}
