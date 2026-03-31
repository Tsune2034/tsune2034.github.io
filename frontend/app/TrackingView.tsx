"use client";

import { useState, useEffect, useCallback } from "react";
import type { Translation } from "./i18n";

// ───────────────────────── Nearby Player types ─────────────────────────
interface NearbyPlayer {
  player_id: number;
  name: string;
  rank: string;
  trust_score: number;
  avg_rating: number;
  completed_jobs: number;
  distance_km: number;
  eta_min: number;
}

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
  player_id?: number;
}

// ───────────────────────── Helpers ─────────────────────────
const ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  chitose: { lat: 42.8193, lng: 141.6488 },
  sapporo: { lat: 43.0621, lng: 141.3544 },
  otaru:   { lat: 43.1907, lng: 140.9947 },
  furano:  { lat: 43.3499, lng: 142.3834 }, // 新富良野プリンスホテル付近
  narita:  { lat: 35.7720, lng: 140.3929 }, // 成田空港
  chiba:   { lat: 35.6073, lng: 140.1063 }, // 千葉市
  tokyo:   { lat: 35.6895, lng: 139.6917 }, // 東京都心
  shinjuku: { lat: 35.6896, lng: 139.7006 }, // 新宿
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

// ───────────────────────── Hand-carry status helpers ─────────────────────────
const HANDCARRY_STATUSES = new Set(["at_airport", "on_train", "walking"]);

function isHandCarry(status: string): boolean {
  return HANDCARRY_STATUSES.has(status);
}

const PLAYER_STEPS = ["at_airport", "on_train", "walking", "done"] as const;
const PLAYER_STEP_LABELS: Record<string, string> = {
  at_airport: "空港",
  on_train:   "電車",
  walking:    "徒歩",
  done:       "完了",
};
const PLAYER_STATUS_LABELS: Record<string, { ja: string; en: string; zh: string; ko: string }> = {
  at_airport: { ja: "空港で荷物受け取り中", en: "Receiving luggage at airport", zh: "在机场取行李", ko: "공항에서 짐 수령 중" },
  on_train:   { ja: "電車で移動中",          en: "On the train",                zh: "乘坐电车中",    ko: "전철 이동 중"       },
  walking:    { ja: "ホテルへ徒歩中",         en: "Walking to hotel",            zh: "步行前往酒店",  ko: "호텔까지 도보 중"  },
  done:       { ja: "配達完了",              en: "Delivered",                   zh: "已送达",        ko: "배달 완료"          },
};

function PlayerProgressBar({ driver, locale }: { driver: DriverInfo; locale?: string }) {
  const status = driver.status;
  const currentIdx = PLAYER_STEPS.indexOf(status as typeof PLAYER_STEPS[number]);
  const pct = Math.max(0, (currentIdx / (PLAYER_STEPS.length - 1)) * 100);
  const lang = (locale ?? "en") as "ja" | "en" | "zh" | "ko";
  const statusLabel = PLAYER_STATUS_LABELS[status]?.[lang] ?? status;

  return (
    <div className="bg-gray-800/60 border border-green-800/50 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧳</span>
          <div>
            <p className="text-xs font-bold text-green-400">Hand Carry</p>
            <p className="text-xs font-semibold text-green-300">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] text-green-400">LIVE</span>
          <span className="text-[10px] text-gray-600 ml-1">{driver.updatedAt}</span>
        </div>
      </div>

      {/* 路線進捗バー */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          {PLAYER_STEPS.map((s, i) => (
            <span
              key={s}
              className={`text-[9px] font-semibold transition-colors ${
                i < currentIdx  ? "text-green-500" :
                i === currentIdx ? "text-green-300" :
                "text-gray-700"
              }`}
            >
              {PLAYER_STEP_LABELS[s]}
            </span>
          ))}
        </div>
        <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-0.5">
          {PLAYER_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                i < currentIdx  ? "bg-green-500 border-green-500" :
                i === currentIdx ? "bg-green-400 border-green-400 ring-2 ring-green-400/30" :
                "bg-gray-800 border-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 電車中のヒント */}
      {status === "on_train" && (
        <p className="text-[10px] text-purple-400 bg-purple-950/30 border border-purple-800/40 rounded-lg px-3 py-1.5">
          電車乗車中 — 地下鉄圏外では最終位置を保持しています
        </p>
      )}
    </div>
  );
}

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

// ───────────────────────── Nearby Players Panel ─────────────────────────
const RANK_BADGE: Record<string, { label: string; color: string }> = {
  new:     { label: "New",     color: "bg-gray-600/40 text-gray-300 border-gray-600/50"       },
  trusted: { label: "Trusted", color: "bg-sky-600/30 text-sky-300 border-sky-500/40"          },
  elite:   { label: "Elite",   color: "bg-amber-500/30 text-amber-300 border-amber-500/40"    },
};

function NearbyPlayersPanel({
  bookingId,
  locale,
}: {
  bookingId: string;
  locale: string;
}) {
  const [players, setPlayers]     = useState<NearbyPlayer[]>([]);
  const [loading, setLoading]     = useState(false);
  const [gpsError, setGpsError]   = useState(false);
  const [selected, setSelected]   = useState<number | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched]   = useState(false);

  const labels: Record<string, Record<string, string>> = {
    title:    { en: "Available Players Nearby", ja: "近くのプレイヤー", zh: "附近的快递员", ko: "근처 플레이어" },
    subtitle: { en: "AI auto-selects best match", ja: "AIが最適プレイヤーを自動選択", zh: "AI自动选择最优", ko: "AI가 최적 플레이어 자동 선택" },
    find:     { en: "Find nearby players", ja: "近くを検索", zh: "搜索附近", ko: "근처 검색" },
    select:   { en: "Select", ja: "選択", zh: "选择", ko: "선택" },
    dispatch: { en: "Request this player", ja: "このプレイヤーにリクエスト", zh: "请求此快递员", ko: "이 플레이어 요청" },
    done:     { en: "Request sent! AI will confirm.", ja: "リクエスト送信済み！AIが確認します", zh: "请求已发送！AI将确认", ko: "요청 전송됨! AI가 확인합니다" },
    eta:      { en: "min", ja: "分", zh: "分钟", ko: "분" },
    jobs:     { en: "jobs", ja: "件", zh: "件", ko: "건" },
    none:     { en: "No players nearby right now", ja: "現在近くにプレイヤーがいません", zh: "目前附近没有快递员", ko: "현재 근처에 플레이어가 없습니다" },
    nogps:    { en: "Enable GPS to find players", ja: "GPSを許可してプレイヤーを検索", zh: "允许GPS搜索快递员", ko: "GPS 허용하여 플레이어 검색" },
  };
  const L = (key: string) => labels[key]?.[locale] ?? labels[key]?.["en"] ?? key;

  function findNearby() {
    if (!navigator.geolocation) { setGpsError(true); return; }
    setLoading(true);
    setGpsError(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(`/api/players-nearby?lat=${lat}&lng=${lng}&radius=3`);
          if (res.ok) setPlayers(await res.json());
        } catch { /* ignore */ } finally {
          setLoading(false);
        }
      },
      () => { setGpsError(true); setLoading(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function requestDispatch() {
    if (!selected) return;
    setDispatching(true);
    try {
      await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      setDispatched(true);
    } catch { /* ignore */ } finally {
      setDispatching(false);
    }
  }

  if (dispatched) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-700/50 rounded-2xl px-4 py-4 text-center space-y-1">
        <p className="text-emerald-400 font-bold text-sm">✅ {L("done")}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/60 rounded-2xl p-4 space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white">{L("title")}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{L("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={findNearby}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-amber-500 text-gray-950 text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
        >
          {loading ? "…" : L("find")}
        </button>
      </div>

      {/* GPS エラー */}
      {gpsError && (
        <p className="text-[11px] text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-xl px-3 py-2">
          {L("nogps")}
        </p>
      )}

      {/* プレイヤーなし */}
      {!loading && players.length === 0 && !gpsError && (
        <p className="text-[11px] text-gray-600 text-center py-2">{L("none")}</p>
      )}

      {/* プレイヤー一覧 */}
      {players.length > 0 && (
        <div className="space-y-2">
          {players.map((p) => {
            const badge = RANK_BADGE[p.rank] ?? RANK_BADGE.new;
            const isSelected = selected === p.player_id;
            return (
              <button
                key={p.player_id}
                type="button"
                onClick={() => setSelected(isSelected ? null : p.player_id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
                  isSelected
                    ? "border-amber-500/70 bg-amber-950/30"
                    : "border-gray-700/60 bg-gray-900/50 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* ランクバッジ */}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badge.color}`}>
                    {badge.label}
                  </span>
                  {/* 名前 */}
                  <p className="text-xs font-semibold text-white flex-1 truncate">{p.name}</p>
                  {/* 評価 */}
                  {p.avg_rating > 0 && (
                    <p className="text-xs text-amber-300 flex-shrink-0">
                      ★ {p.avg_rating.toFixed(1)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                  <span>📍 {p.distance_km.toFixed(1)} km</span>
                  <span>⏱ {p.eta_min}{L("eta")}</span>
                  <span>✅ {p.completed_jobs}{L("jobs")}</span>
                </div>
                {/* 信頼スコアバー */}
                <div className="mt-1.5 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                    style={{ width: `${Math.min(100, p.trust_score)}%` }}
                  />
                </div>
              </button>
            );
          })}

          {/* リクエストボタン */}
          {selected && (
            <button
              type="button"
              onClick={requestDispatch}
              disabled={dispatching}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-gray-950 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {dispatching ? "…" : L("dispatch")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Customer Message Panel ─────────────────────────
const MSG_CONFIG: Record<string, { icon: string; labels: Record<string, string> }> = {
  coming_out:   { icon: "🚶", labels: { en: "Coming out of customs now!", ja: "もうすぐ出口に出ます",        zh: "马上出海关了",        ko: "곧 세관을 나옵니다"          } },
  red_bag:      { icon: "🧳", labels: { en: "My bag is red",              ja: "荷物は赤いスーツケースです",  zh: "我的行李是红色箱子",  ko: "제 가방은 빨간 캐리어입니다" } },
  wait_please:  { icon: "⏳", labels: { en: "Please wait 5–10 min",       ja: "少し待ってください（5〜10分）",zh: "请稍等5~10分钟",      ko: "5~10분만 기다려 주세요"       } },
  where_driver: { icon: "📍", labels: { en: "Where are you?",             ja: "ドライバーはどこですか？",    zh: "司机在哪里？",        ko: "드라이버 어디 계세요?"       } },
};

function CustomerMessagePanel({ bookingId, locale, status }: { bookingId: string; locale: string; status: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (status === "delivered") return null;

  async function sendMsg(key: string) {
    if (loading || sent) return;
    setLoading(true);
    try {
      await fetch(`/api/booking?id=${encodeURIComponent(bookingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_key: key }),
      });
      setSent(key);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-600 text-center">
        {{ en: "Send a quick message to your driver", ja: "ドライバーへ一言", zh: "发送消息给司机", ko: "드라이버에게 메시지" }[locale] ?? "Message driver"}
      </p>
      {sent ? (
        <div className="flex items-center gap-2 bg-green-950/40 border border-green-700 rounded-xl px-4 py-3">
          <span className="text-lg">{MSG_CONFIG[sent].icon}</span>
          <p className="text-sm font-semibold text-green-300">{MSG_CONFIG[sent].labels[locale] ?? MSG_CONFIG[sent].labels.en}</p>
          <span className="ml-auto text-xs text-green-600">✓ sent</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MSG_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              disabled={loading}
              onClick={() => sendMsg(key)}
              className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:border-amber-500 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50"
            >
              <span className="text-lg flex-shrink-0">{cfg.icon}</span>
              <span className="text-xs text-gray-300 leading-tight">{cfg.labels[locale] ?? cfg.labels.en}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── ReviewForm ─────────────────────────
const REVIEW_LABELS: Record<string, { title: string; on_time: string; comment: string; submit: string; done: string }> = {
  en: { title: "Rate your carrier", on_time: "On time?", comment: "Comment (optional)", submit: "Submit review", done: "Thank you for your review!" },
  ja: { title: "配送担当を評価する", on_time: "時間通りでしたか？", comment: "コメント（任意）", submit: "レビューを送信", done: "レビューありがとうございました！" },
  zh: { title: "评价配送员", on_time: "是否准时？", comment: "评论（可选）", submit: "提交评价", done: "感谢您的评价！" },
  ko: { title: "배송원 평가", on_time: "제시간에 도착했나요?", comment: "코멘트 (선택)", submit: "리뷰 제출", done: "리뷰 감사합니다!" },
};

function ReviewForm({ bookingId, playerId, locale }: { bookingId: string; playerId: number; locale: string }) {
  const L = REVIEW_LABELS[locale] ?? REVIEW_LABELS.en;
  const [rating, setRating]     = useState(0);
  const [hover, setHover]       = useState(0);
  const [onTime, setOnTime]     = useState<boolean | null>(null);
  const [comment, setComment]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          booking_id: bookingId,
          rating,
          on_time: onTime ?? true,
          comment: comment.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-950 border border-green-800 rounded-2xl p-5 text-center">
        <p className="text-2xl mb-2">⭐</p>
        <p className="text-sm font-semibold text-green-400">{L.done}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 space-y-4">
      <p className="text-sm font-semibold text-gray-200">{L.title}</p>

      {/* Star rating */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            className={`text-2xl transition-transform hover:scale-110 ${(hover || rating) >= s ? "text-amber-400" : "text-gray-700"}`}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </button>
        ))}
      </div>

      {/* On-time */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-400">{L.on_time}</p>
        <button
          type="button"
          onClick={() => setOnTime(true)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${onTime === true ? "bg-green-700 text-green-100" : "bg-gray-700 text-gray-400"}`}
        >👍</button>
        <button
          type="button"
          onClick={() => setOnTime(false)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${onTime === false ? "bg-red-800 text-red-200" : "bg-gray-700 text-gray-400"}`}
        >👎</button>
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={L.comment}
        rows={2}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-amber-600"
      />

      <button
        type="button"
        onClick={submit}
        disabled={rating === 0 || submitting}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-gray-950 font-bold text-sm hover:bg-amber-400 transition-colors disabled:opacity-40"
      >
        {submitting ? "…" : L.submit}
      </button>
    </div>
  );
}


// ───────────────────────── Main ─────────────────────────
export default function TrackingView({ tr, initialNumber, locale = "en" }: { tr: Translation; initialNumber?: string; locale?: string }) {
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
        const dest = ZONE_COORDS[data.zone as string] ?? ZONE_COORDS.chitose;
        const distKm = haversineKm(data.driver_lat, data.driver_lng, dest.lat, dest.lng);

        // Google Directions API でリアルタイムETA取得（失敗時は距離計算にフォールバック）
        let etaMin = Math.round((distKm / 30) * 60);
        try {
          const etaRes = await fetch(
            `/api/eta?olat=${data.driver_lat}&olng=${data.driver_lng}&dlat=${dest.lat}&dlng=${dest.lng}`
          );
          if (etaRes.ok) {
            const etaData = await etaRes.json();
            etaMin = etaData.durationMin;
          }
        } catch { /* フォールバック維持 */ }

        driver = {
          lat: data.driver_lat,
          lng: data.driver_lng,
          status: data.driver_status ?? "heading",
          updatedAt: data.driver_updated_at
            ? new Date(data.driver_updated_at).toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" })
            : "--:--",
          distanceKm: distKm,
          etaMin,
        };
      }

      const now = new Date();
      setInfo({
        trackingNumber: data.booking_id,
        status: (data.status as DeliveryStatus) ?? "confirmed",
        from: tr.track_from,
        to:   tr.track_to,
        eta:  driver
          ? new Date(now.getTime() + driver.etaMin * 60_000).toLocaleString("ja-JP", {
              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
            })
          : new Date(now.getTime() + 2 * 3600 * 1000).toLocaleString("ja-JP", {
              month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
            }),
        updatedAt: now.toLocaleString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
        driver,
        player_id: data.player_id ?? undefined,
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

          {/* GPS表示: ハンドキャリー=路線進捗バー、車=距離バー */}
          {info.driver && (
            isHandCarry(info.driver.status)
              ? <PlayerProgressBar driver={info.driver} locale={locale} />
              : <DriverCard driver={info.driver} tr={tr} />
          )}

          {/* ドライバーへの定型メッセージ */}
          <CustomerMessagePanel bookingId={info.trackingNumber} locale={locale} status={info.status} />

          {/* プレイヤー選択UI: 予約確認済み・未アサイン時に表示 */}
          {(info.status === "confirmed" || info.status === "booked") && !info.driver && (
            <NearbyPlayersPanel bookingId={info.trackingNumber} locale={locale} />
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <Timeline info={info} tr={tr} />
          </div>

          {info.status === "delivered" && info.player_id && (
            <ReviewForm bookingId={info.trackingNumber} playerId={info.player_id} locale={locale} />
          )}
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
