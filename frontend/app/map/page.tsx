"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const JapanHeatMap = dynamic(
  () => import("../components/JapanHeatMap"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-slate-400">Loading map…</div> }
);

const STATS = [
  { label: "2024 Inbound Visitors", value: "36.9M", sub: "過去最高", color: "#ef4444" },
  { label: "Total Consumption", value: "¥8.1T", sub: "前年比+53%", color: "#f97316" },
  { label: "Per Visitor Spend", value: "¥227K", sub: "平均消費額", color: "#eab308" },
  { label: "KAIROX Target Cities", value: "6", sub: "拠点展開予定", color: "#22c55e" },
];

const BASES = [
  { city: "成田 / 東京", flag: "✈", status: "稼働中", color: "#22c55e", visitors: "14.5M", nights: "56.8M泊", station: "新宿JR 1,473,430/年" },
  { city: "大阪 / 京都", flag: "🏯", status: "次の一手", color: "#f97316", visitors: "12.9M + 9.7M", nights: "42.3M泊", station: "大阪JR 813,153/年" },
  { city: "福岡", flag: "🎌", status: "フェーズ3", color: "#3b82f6", visitors: "3.6M", nights: "7.4M泊", station: "博多地下鉄 121,011/年" },
  { city: "北海道", flag: "⛷️", status: "スキー特化", color: "#8b5cf6", visitors: "2.2M", nights: "10.3M泊（4.7泊/人）", station: "札幌JR 180,098/年" },
  { city: "名古屋", flag: "🏙️", status: "フェーズ5", color: "#64748b", visitors: "1.9M", nights: "3.9M泊", station: "名古屋地下鉄 324,852/年" },
];

export default function MapPage() {
  const [lang, setLang] = useState<"en" | "ja">("ja");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      {/* ヘッダー */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              KAIROX <span className="text-blue-400">Inbound Map</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              訪日インバウンド需要 × 拠点展開戦略マップ
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang("ja")}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${lang === "ja" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              JA
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${lang === "en" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              EN
            </button>
            <a
              href="/narita"
              className="px-3 py-1 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              予約 →
            </a>
          </div>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* メインマップ */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 border border-slate-800 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-bold text-slate-300">🗾 インバウンド需要ヒートマップ</span>
            <span className="text-xs text-slate-500">千葉・東京はクリックでドリルダウン</span>
          </div>
          <JapanHeatMap locale={lang} />
        </div>

        {/* 拠点展開テーブル */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 border border-slate-800 mb-8">
          <h2 className="text-sm font-bold text-slate-300 mb-4">🏢 KAIROX 拠点展開ロードマップ</h2>
          <div className="space-y-3">
            {BASES.map((b) => (
              <div key={b.city} className="flex flex-col md:flex-row md:items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 md:w-48">
                  <span className="text-xl">{b.flag}</span>
                  <div>
                    <div className="font-bold text-sm text-white">{b.city}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: b.color + "33", color: b.color }}>
                      {b.status}
                    </span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500">訪問者数/年</div>
                    <div className="text-white font-bold">{b.visitors}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">宿泊者数</div>
                    <div className="text-white font-bold">{b.nights}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">主要駅乗降客</div>
                    <div className="text-blue-300 font-bold text-[10px]">{b.station}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* データソース */}
        <div className="text-xs text-slate-600 text-center space-y-1">
          <p>Data Sources: JNTO 2024年訪日外客統計（確報）/ 観光庁インバウンド消費動向調査 / 国土交通省MLIT 駅別乗降客数API</p>
          <p>地図: デジタル庁 行政区域ポリゴンデータ 2025年（令和7年）版（CC BY 4.0）/ digital-go-jp/policy-dashboard-assets</p>
          <p>© 2026 KAIROX — Japan Luggage Freedom</p>
        </div>
      </div>
    </main>
  );
}
