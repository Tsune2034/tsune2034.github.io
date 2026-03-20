"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BookingStatus {
  booking_id: string;
  status: string;
  driver_status?: string | null;
  driver_updated_at?: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { en: string; ja: string; zh: string; ko: string; icon: string; color: string }> = {
  confirmed:  { en: "Confirmed",         ja: "予約確定",       zh: "已确认",     ko: "예약 확정",    icon: "✅", color: "text-green-400" },
  pickup:     { en: "Driver en route",   ja: "ドライバー向かい中", zh: "司机出发中", ko: "드라이버 이동 중", icon: "🚐", color: "text-amber-400" },
  transit:    { en: "Luggage en route",  ja: "配達中",          zh: "运输中",     ko: "배송 중",      icon: "📦", color: "text-blue-400" },
  delivered:  { en: "Delivered",         ja: "配達完了",        zh: "已送达",     ko: "배송 완료",    icon: "🎉", color: "text-green-400" },
  cancelled:  { en: "Cancelled",         ja: "キャンセル済み",  zh: "已取消",     ko: "취소됨",       icon: "❌", color: "text-red-400" },
};

type Locale = "en" | "ja" | "zh" | "ko";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "zh", label: "中" },
  { value: "ko", label: "한" },
];

export default function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  async function fetchStatus() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiUrl}/bookings/${id}`);
      if (!res.ok) throw new Error("not found");
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 30_000); // poll every 30s
    return () => clearInterval(iv);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusInfo = data ? (STATUS_LABELS[data.status] ?? STATUS_LABELS.confirmed) : null;

  const label = (s: typeof statusInfo) => {
    if (!s) return "";
    return locale === "ja" ? s.ja : locale === "zh" ? s.zh : locale === "ko" ? s.ko : s.en;
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-[#0A0F1C] border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/narita" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← KAIROX</a>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">Narita</span>
          </div>
          <div className="flex items-center gap-0.5">
            {LOCALES.map((l) => (
              <button key={l.value} type="button" onClick={() => setLocale(l.value)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${locale === l.value ? "bg-amber-500 text-gray-950 font-semibold" : "text-gray-500 hover:text-gray-300"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-black text-white">
            {locale === "ja" ? "予約状況" : locale === "zh" ? "预订状态" : locale === "ko" ? "예약 현황" : "Booking Status"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{id}</p>
        </div>

        {loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-amber-400 inline-block"
                  style={{ animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {locale === "ja" ? "確認中…" : locale === "zh" ? "查询中…" : locale === "ko" ? "확인 중…" : "Checking…"}
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-6 text-center space-y-2">
            <p className="text-2xl">🔍</p>
            <p className="text-sm font-bold text-white">
              {locale === "ja" ? "予約が見つかりません" : locale === "zh" ? "未找到预订" : locale === "ko" ? "예약을 찾을 수 없습니다" : "Booking not found"}
            </p>
            <p className="text-xs text-gray-500">
              {locale === "ja" ? "予約IDをご確認ください" : locale === "zh" ? "请确认您的预订ID" : locale === "ko" ? "예약 ID를 확인해 주세요" : "Please check your booking ID"}
            </p>
          </div>
        )}

        {data && statusInfo && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{statusInfo.icon}</span>
                <div>
                  <p className={`text-xl font-black ${statusInfo.color}`}>{label(statusInfo)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {locale === "ja" ? "最終更新" : locale === "zh" ? "最后更新" : locale === "ko" ? "마지막 업데이트" : "Last updated"}:
                    {" "}{data.driver_updated_at
                      ? new Date(data.driver_updated_at).toLocaleTimeString()
                      : new Date(data.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Progress steps */}
              <div className="space-y-2 pt-2">
                {[
                  { key: "confirmed", en: "Booking confirmed", ja: "予約確定", zh: "预订确认", ko: "예약 확정", icon: "✅" },
                  { key: "pickup",    en: "Driver heading to pickup", ja: "ドライバー出発", zh: "司机出发", ko: "드라이버 출발", icon: "🚐" },
                  { key: "transit",   en: "Luggage on the way", ja: "配達中", zh: "运输中", ko: "배송 중", icon: "📦" },
                  { key: "delivered", en: "Delivered", ja: "配達完了", zh: "已送达", ko: "배송 완료", icon: "🎉" },
                ].map((s) => {
                  const statusOrder = ["confirmed", "pickup", "transit", "delivered"];
                  const currentIdx = statusOrder.indexOf(data.status);
                  const thisIdx = statusOrder.indexOf(s.key);
                  const done = thisIdx < currentIdx;
                  const active = thisIdx === currentIdx;
                  const stepLabel = locale === "ja" ? s.ja : locale === "zh" ? s.zh : locale === "ko" ? s.ko : s.en;
                  return (
                    <div key={s.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      done ? "border-gray-700 bg-gray-800/30 opacity-60" :
                      active ? "border-amber-500 bg-amber-950/30" :
                      "border-gray-800 opacity-30"
                    }`}>
                      <span className="text-base flex-shrink-0">{s.icon}</span>
                      <p className={`text-sm flex-1 ${done ? "line-through text-gray-600" : active ? "text-white font-semibold" : "text-gray-600"}`}>
                        {stepLabel}
                      </p>
                      {done && <span className="text-amber-500 text-xs">✓</span>}
                      {active && (
                        <span className="inline-flex gap-1">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
                              style={{ animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite` }} />
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking ID */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Booking ID</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{data.booking_id}</span>
            </div>

            {/* Auto-refresh note */}
            <p className="text-center text-[10px] text-gray-700">
              {locale === "ja" ? "30秒ごとに自動更新" : locale === "zh" ? "每30秒自动刷新" : locale === "ko" ? "30초마다 자동 갱신" : "Auto-refreshes every 30 seconds"}
            </p>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
