"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const JapanHeatMap = dynamic(
  () => import("../components/JapanHeatMap"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-slate-400">Loading map…</div> }
);

const MONTHLY = [
  { m: "Jan", v: 2688100 }, { m: "Feb", v: 2788800 }, { m: "Mar", v: 3081400 },
  { m: "Apr", v: 3042900 }, { m: "May", v: 3040100 }, { m: "Jun", v: 2777200 },
  { m: "Jul", v: 3130700 }, { m: "Aug", v: 2929400 }, { m: "Sep", v: 2870400 },
  { m: "Oct", v: 3312200 }, { m: "Nov", v: 3193400 }, { m: "Dec", v: 2995300 },
];
const MAX_MONTHLY = Math.max(...MONTHLY.map(d => d.v));

const NATIONALITIES = [
  { label: "韓国",   v: 8840200, color: "#3b82f6" },
  { label: "中国",   v: 6794400, color: "#ef4444" },
  { label: "台湾",   v: 4990900, color: "#22c55e" },
  { label: "米国",   v: 2310100, color: "#f59e0b" },
  { label: "香港",   v: 2263300, color: "#8b5cf6" },
  { label: "タイ",  v: 1360500, color: "#06b6d4" },
  { label: "豪州",   v:  729000, color: "#f97316" },
  { label: "その他", v: 5600400, color: "#64748b" },
];
const MAX_NAT = Math.max(...NATIONALITIES.map(d => d.v));

const STATS = [
  { value: "36.9M", color: "#ef4444", label: "2024年 訪日外客数", sub: "過去最高（確報）" },
  { value: "+15%",  color: "#f97316", label: "2025年 前年比",     sub: "1-6月速報・拡大継続" },
  { value: "¥227K", color: "#eab308", label: "一人当消費額",      sub: "2024年 平均消費額" },
  { value: "6",     color: "#22c55e", label: "KAIROX 目標都市",   sub: "拠点展開予定" },
];

interface BaseInfo {
  city: string; flag: string; status: string; color: string;
  visitors: string; nights: string; station: string;
  airport: string; airportPax: string; zone: string; why: string;
}

const BASES: BaseInfo[] = [
  // ─── フェーズ1（優先展開）───
  {
    city: "成田 / 東京", flag: "✈", status: "稼働中", color: "#22c55e",
    visitors: "14.5M", nights: "56.8M泊", station: "新宿JR 1,473,430/日",
    airport: "成田国際空港", airportPax: "4,000万人/年 · 約160路線",
    zone: "成田→東京都心 約60km圏",
    why: "訪日の約1/3が成田着。空港直結配送で到着即・手ぶら観光を実現。",
  },
  {
    city: "千歳（空港）/ 札幌", flag: "🏔️", status: "フェーズ1", color: "#22c55e",
    visitors: "2.2M", nights: "10.3M泊（4.7泊/人）", station: "札幌JR 180,098/日",
    airport: "新千歳空港", airportPax: "2,200万人/年",
    zone: "新千歳→札幌・小樽（ニセコ・富良野・函館 展開予定）",
    why: "平均4.7泊の長期滞在。冬はスキー機材・夏はラベンダー観光の大荷物。年間通じて手ぶら需要が大きい。",
  },
  // ─── 次フェーズ ───
  {
    city: "大阪 / 京都", flag: "🏯", status: "フェーズ2", color: "#f97316",
    visitors: "12.9M + 9.7M", nights: "42.3M泊", station: "大阪JR 813,153/日",
    airport: "関西国際空港", airportPax: "3,000万人/年",
    zone: "関空→大阪・京都・奈良 広域カバー",
    why: "大阪・京都の合計23M人。関西周遊パターンに最適な配送ハブ。",
  },
  {
    city: "福岡", flag: "🎌", status: "フェーズ3", color: "#3b82f6",
    visitors: "3.6M", nights: "7.4M泊", station: "博多地下鉄 121,011/日",
    airport: "福岡空港", airportPax: "2,500万人/年（国内+国際）",
    zone: "博多→天神 市内完結型",
    why: "韓国・中国からの短距離フライト集中。リピーター比率が高く消費力大。",
  },
  {
    city: "名古屋", flag: "🏙️", status: "フェーズ5", color: "#64748b",
    visitors: "1.9M", nights: "3.9M泊", station: "名古屋地下鉄 324,852/日",
    airport: "中部国際空港（セントレア）", airportPax: "1,200万人/年",
    zone: "セントレア→名古屋市内",
    why: "製造業インバウンドと観光が混在。豊田・トヨタ関連の需要も見込む。",
  },
];

export default function MapPage() {
  const [modal, setModal] = useState<BaseInfo | null>(null);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              KAIROX <span className="text-blue-400">Inbound Map</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">訪日インバウンド需要 × 拠点展開戦略マップ</p>
          </div>
          <a href="/narita"
            className="px-4 py-2 rounded text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors">
            予約 →
          </a>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATS.map((s) => (
            <div key={s.label} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">{s.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* メインマップ */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 border border-slate-800 mb-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm font-bold text-slate-300">🗾 インバウンド需要ヒートマップ</span>
            <span className="text-xs text-slate-500">千葉・東京・大阪・福岡・北海道はクリックでドリルダウン</span>
          </div>
          <JapanHeatMap locale="ja" />
        </div>

        {/* 月別チャート + 国籍チャート */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* 月別 */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 mb-3">📅 月別訪日者数（2024年）</h2>
            <div className="flex items-end gap-1 h-28">
              {MONTHLY.map(({ m, v }) => {
                const h = (v / MAX_MONTHLY) * 100;
                const peak = v === MAX_MONTHLY;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div
                      className="w-full rounded-t-sm transition-all duration-200 group-hover:brightness-125"
                      style={{ height: `${h}%`, background: peak ? "#ef4444" : "#3b82f6", minHeight: 3 }}
                    />
                    <span className="text-[8px] text-slate-600">{m}</span>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                      {(v / 1_000_000).toFixed(2)}M人
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-right">出典: JNTO 2024年確報</p>
          </div>

          {/* 国籍別 */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 mb-3">🌏 国籍別訪日外客（2024年確報）</h2>
            <div className="space-y-1.5">
              {NATIONALITIES.map((n) => (
                <div key={n.label} className="flex items-center gap-2">
                  <div className="w-12 text-[10px] text-slate-300 text-right shrink-0">{n.label}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(n.v / MAX_NAT) * 100}%`, background: n.color }} />
                  </div>
                  <div className="text-[10px] text-slate-400 w-10 shrink-0 text-right">{(n.v / 1_000_000).toFixed(1)}M</div>
                </div>
              ))}
            </div>
            <div className="mt-2 px-2 py-1.5 rounded-lg bg-slate-800/60 text-[9px] text-slate-400 leading-relaxed">
              📊 2025年速報（1〜6月）: 韓国・中国が引き続き上位。中国は前年比+30〜40%で急回復。国籍別年次確報はJNTO翌年3月公表。
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 text-right">出典: JNTO 2024年確報 / 2025年速報</p>
          </div>
        </div>

        {/* 拠点展開テーブル */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 border border-slate-800 mb-8">
          <h2 className="text-sm font-bold text-slate-300 mb-4">🏢 KAIROX 拠点展開ロードマップ</h2>
          <div className="space-y-2">
            {BASES.map((b) => (
              <div
                key={b.city}
                className="flex flex-col md:flex-row md:items-center gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:border-slate-500 transition-all"
                onClick={() => setModal(b)}
              >
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
                <span className="shrink-0 text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 font-bold self-start md:self-auto">
                  なぜ？
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* データソース */}
        <div className="text-xs text-slate-600 text-center space-y-1">
          <p>出典: JNTO 2024年訪日外客統計（確報）/ 観光庁インバウンド消費動向調査 / 国土交通省MLIT 駅別乗降客数API</p>
          <p>地図: デジタル庁 行政区域ポリゴンデータ 2025年（令和7年）版（CC BY 4.0）</p>
          <p>© 2026 KAIROX — Japan Luggage Freedom</p>
        </div>
      </div>

      {/* 拠点詳細モーダル */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-slate-900 rounded-2xl p-6 border border-slate-700 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{modal.flag}</span>
                <div>
                  <h3 className="font-black text-lg text-white">{modal.city}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: modal.color + "33", color: modal.color }}>
                    {modal.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setModal(null)}
                className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors">
                閉じる
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">✈ 空港</div>
                <div className="text-sm text-white font-bold">{modal.airport}</div>
                <div className="text-xs text-slate-400 mt-0.5">{modal.airportPax}</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">📦 配送エリア</div>
                <div className="text-sm text-white">{modal.zone}</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-blue-800/50">
                <div className="text-xs text-blue-400 mb-1 font-bold">💡 戦略</div>
                <div className="text-sm text-slate-200 leading-relaxed">{modal.why}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: "訪問者数/年", val: modal.visitors },
                  { label: "宿泊者数",   val: modal.nights },
                  { label: "主要駅",     val: modal.station },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-800/60 rounded-xl p-2 text-center">
                    <div className="text-slate-500 text-[10px]">{label}</div>
                    <div className="font-bold text-white mt-0.5 text-[10px] leading-tight">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
