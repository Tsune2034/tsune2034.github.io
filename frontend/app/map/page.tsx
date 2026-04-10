"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const JapanHeatMap = dynamic(
  () => import("../components/JapanHeatMap"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-64 text-slate-400">Loading map…</div> }
);

type Lang = "en" | "ja" | "zh" | "ko";

const T: Record<Lang, Record<string, string>> = {
  en: {
    subtitle: "Japan Inbound Demand × Base Expansion Strategy",
    stat1: "2024 Inbound Visitors", stat1sub: "All-time high",
    stat2: "Total Consumption", stat2sub: "YoY +53%",
    stat3: "Per Visitor Spend", stat3sub: "Average spend",
    stat4: "KAIROX Target Cities", stat4sub: "Planned bases",
    mapTitle: "Inbound Demand Heatmap",
    mapHint: "Click Chiba / Tokyo / Osaka / Fukuoka / Hokkaido to drill down",
    roadmapTitle: "KAIROX Base Expansion Roadmap",
    visitors: "Visitors/yr", nights: "Overnights", station: "Key Station PAX",
    monthlyTitle: "Monthly Inbound Visitors (2024)",
    natTitle: "Inbound by Nationality (2024)",
    book: "Book →", whyBtn: "Why?", modalClose: "Close",
    airport: "Airport", zone: "Delivery Zone", strat: "Strategy",
  },
  ja: {
    subtitle: "訪日インバウンド需要 × 拠点展開戦略マップ",
    stat1: "2024年 訪日外客数", stat1sub: "過去最高",
    stat2: "総消費額", stat2sub: "前年比+53%",
    stat3: "一人当消費額", stat3sub: "平均消費額",
    stat4: "KAIROX 目標都市", stat4sub: "拠点展開予定",
    mapTitle: "インバウンド需要ヒートマップ",
    mapHint: "千葉・東京・大阪・福岡・北海道はクリックでドリルダウン",
    roadmapTitle: "KAIROX 拠点展開ロードマップ",
    visitors: "訪問者数/年", nights: "宿泊者数", station: "主要駅乗降客",
    monthlyTitle: "月別訪日者数（2024年）",
    natTitle: "国籍別訪日外客（2024年）",
    book: "予約 →", whyBtn: "なぜ？", modalClose: "閉じる",
    airport: "空港", zone: "配送エリア", strat: "戦略",
  },
  zh: {
    subtitle: "日本入境旅客需求 × 据点展开战略地图",
    stat1: "2024年 入境旅客数", stat1sub: "历史最高",
    stat2: "总消费额", stat2sub: "同比+53%",
    stat3: "人均消费额", stat3sub: "平均消费",
    stat4: "KAIROX 目标城市", stat4sub: "据点展开计划",
    mapTitle: "入境需求热力图",
    mapHint: "点击千叶・东京・大阪・福冈・北海道可下钻",
    roadmapTitle: "KAIROX 据点展开路线图",
    visitors: "访客数/年", nights: "住宿人次", station: "主要车站客流",
    monthlyTitle: "月度入境旅客数（2024年）",
    natTitle: "按国籍入境旅客（2024年）",
    book: "预订 →", whyBtn: "为何？", modalClose: "关闭",
    airport: "机场", zone: "配送范围", strat: "战略",
  },
  ko: {
    subtitle: "방일 인바운드 수요 × 거점 전개 전략 맵",
    stat1: "2024년 방일 관광객", stat1sub: "역대 최고",
    stat2: "총 소비액", stat2sub: "전년비 +53%",
    stat3: "1인당 소비액", stat3sub: "평균 소비액",
    stat4: "KAIROX 목표 도시", stat4sub: "거점 전개 예정",
    mapTitle: "인바운드 수요 히트맵",
    mapHint: "지바・도쿄・오사카・후쿠오카・홋카이도 클릭으로 드릴다운",
    roadmapTitle: "KAIROX 거점 전개 로드맵",
    visitors: "방문자수/년", nights: "숙박자수", station: "주요역 승하차객",
    monthlyTitle: "월별 방일 관광객수（2024년）",
    natTitle: "국적별 방일 관광객（2024년）",
    book: "예약 →", whyBtn: "왜？", modalClose: "닫기",
    airport: "공항", zone: "배송 구역", strat: "전략",
  },
};

const MONTHLY = [
  { m: "Jan", v: 2688100 }, { m: "Feb", v: 2788800 }, { m: "Mar", v: 3081400 },
  { m: "Apr", v: 3042900 }, { m: "May", v: 3040100 }, { m: "Jun", v: 2777200 },
  { m: "Jul", v: 3130700 }, { m: "Aug", v: 2929400 }, { m: "Sep", v: 2870400 },
  { m: "Oct", v: 3312200 }, { m: "Nov", v: 3193400 }, { m: "Dec", v: 2995300 },
];
const MAX_MONTHLY = Math.max(...MONTHLY.map(d => d.v));

const NATIONALITIES = [
  { key: "Korea",     ja: "韓国",   zh: "韩国",    ko: "한국",   v: 8840200, color: "#3b82f6" },
  { key: "China",     ja: "中国",   zh: "中国",    ko: "중국",   v: 6794400, color: "#ef4444" },
  { key: "Taiwan",    ja: "台湾",   zh: "台湾",    ko: "대만",   v: 4990900, color: "#22c55e" },
  { key: "USA",       ja: "米国",   zh: "美国",    ko: "미국",   v: 2310100, color: "#f59e0b" },
  { key: "Hong Kong", ja: "香港",   zh: "香港",    ko: "홍콩",   v: 2263300, color: "#8b5cf6" },
  { key: "Thailand",  ja: "タイ",  zh: "泰国",    ko: "태국",   v: 1360500, color: "#06b6d4" },
  { key: "Australia", ja: "豪州",   zh: "澳大利亚", ko: "호주",  v: 729000,  color: "#f97316" },
  { key: "Others",    ja: "その他", zh: "其他",    ko: "기타",   v: 5600400, color: "#64748b" },
];
const MAX_NAT = Math.max(...NATIONALITIES.map(d => d.v));

const STATS = [
  { value: "36.9M", color: "#ef4444", lk: "stat1", sk: "stat1sub" },
  { value: "¥8.1T", color: "#f97316", lk: "stat2", sk: "stat2sub" },
  { value: "¥227K", color: "#eab308", lk: "stat3", sk: "stat3sub" },
  { value: "6",     color: "#22c55e", lk: "stat4", sk: "stat4sub" },
];

interface BaseInfo {
  city: string; flag: string; status: string; color: string;
  visitors: string; nights: string; station: string;
  airport: string; airportPax: string; zone: string;
  why: string; whyZh: string; whyKo: string;
}

const BASES: BaseInfo[] = [
  {
    city: "成田 / 東京", flag: "✈", status: "稼働中", color: "#22c55e",
    visitors: "14.5M", nights: "56.8M泊", station: "新宿JR 1,473,430/日",
    airport: "成田国際空港", airportPax: "4,000万人/年 · 約160路線",
    zone: "成田→東京都心 約60km圏",
    why: "訪日の約1/3が成田着。空港直結配送で到着即・手ぶら観光を実現。",
    whyZh: "约1/3的访日旅客经由成田入境。机场直连配送，实现即到即游。",
    whyKo: "방일 여객의 약 1/3이 나리타 도착. 공항 직결 배송으로 짐 없는 관광 실현.",
  },
  {
    city: "大阪 / 京都", flag: "🏯", status: "次の一手", color: "#f97316",
    visitors: "12.9M + 9.7M", nights: "42.3M泊", station: "大阪JR 813,153/日",
    airport: "関西国際空港", airportPax: "3,000万人/年",
    zone: "関空→大阪・京都・奈良 広域カバー",
    why: "大阪・京都の合計23M人。関西周遊パターンに最適な配送ハブ。",
    whyZh: "大阪・京都合计23M人次。最适合关西巡游模式的配送枢纽。",
    whyKo: "오사카・교토 합계 23M명. 간사이 여행 패턴에 최적의 배송 허브.",
  },
  {
    city: "福岡", flag: "🎌", status: "フェーズ3", color: "#3b82f6",
    visitors: "3.6M", nights: "7.4M泊", station: "博多地下鉄 121,011/日",
    airport: "福岡空港", airportPax: "2,500万人/年（国内+国際）",
    zone: "博多→天神 市内完結型",
    why: "韓国・中国からの短距離フライト集中。リピーター比率が高く消費力大。",
    whyZh: "来自韩中的短途航班集中。回头客比例高，消费力强。",
    whyKo: "한중 단거리 노선 집중. 재방문객 비율 높고 소비력 강함.",
  },
  {
    city: "北海道", flag: "⛷️", status: "スキー特化", color: "#8b5cf6",
    visitors: "2.2M", nights: "10.3M泊（4.7泊/人）", station: "札幌JR 180,098/日",
    airport: "新千歳空港", airportPax: "2,200万人/年",
    zone: "新千歳→札幌・ニセコ スキーリゾート特化",
    why: "平均4.7泊の長期滞在。スキー機材は特に手ぶら需要が高く単価大。",
    whyZh: "平均住宿4.7晚。滑雪装备极度需要免手提服务，客单价高。",
    whyKo: "평균 4.7박 장기 체류. 스키 장비는 특히 짐 없는 여행 수요가 높고 단가 큰.",
  },
  {
    city: "名古屋", flag: "🏙️", status: "フェーズ5", color: "#64748b",
    visitors: "1.9M", nights: "3.9M泊", station: "名古屋地下鉄 324,852/日",
    airport: "中部国際空港（セントレア）", airportPax: "1,200万人/年",
    zone: "セントレア→名古屋市内",
    why: "製造業インバウンドと観光が混在。豊田・トヨタ関連の需要も見込む。",
    whyZh: "制造业入境商务与观光混合。预计还有丰田相关需求。",
    whyKo: "제조업 인바운드와 관광 혼재. 도요타 관련 수요도 기대.",
  },
];

export default function MapPage() {
  const [lang, setLang] = useState<Lang>("ja");
  const [modal, setModal] = useState<BaseInfo | null>(null);

  const t = (k: string) => T[lang][k] ?? k;
  const natName = (n: typeof NATIONALITIES[0]) =>
    lang === "ja" ? n.ja : lang === "zh" ? n.zh : lang === "ko" ? n.ko : n.key;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              KAIROX <span className="text-blue-400">Inbound Map</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {(["ja", "en", "zh", "ko"] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${lang === l ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                {l.toUpperCase()}
              </button>
            ))}
            <a href="/narita"
              className="px-3 py-1 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors ml-1">
              {t("book")}
            </a>
          </div>
        </div>

        {/* KPIカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATS.map((s) => (
            <div key={s.lk} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-300 mt-1 font-medium">{t(s.lk)}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t(s.sk)}</div>
            </div>
          ))}
        </div>

        {/* メインマップ */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 border border-slate-800 mb-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm font-bold text-slate-300">🗾 {t("mapTitle")}</span>
            <span className="text-xs text-slate-500">{t("mapHint")}</span>
          </div>
          <JapanHeatMap locale={lang} />
        </div>

        {/* 月別チャート + 国籍チャート */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          {/* 月別 */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 mb-3">📅 {t("monthlyTitle")}</h2>
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
                      {(v / 1_000_000).toFixed(2)}M
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-right">Source: JNTO 2024年確報</p>
          </div>

          {/* 国籍別 */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 mb-3">🌏 {t("natTitle")}</h2>
            <div className="space-y-1.5">
              {NATIONALITIES.map((n) => (
                <div key={n.key} className="flex items-center gap-2">
                  <div className="w-14 text-[10px] text-slate-300 text-right shrink-0">{natName(n)}</div>
                  <div className="flex-1 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(n.v / MAX_NAT) * 100}%`, background: n.color }} />
                  </div>
                  <div className="text-[10px] text-slate-400 w-10 shrink-0 text-right">{(n.v / 1_000_000).toFixed(1)}M</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-right">Source: JNTO 2024年確報</p>
          </div>
        </div>

        {/* 拠点展開テーブル */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-6 border border-slate-800 mb-8">
          <h2 className="text-sm font-bold text-slate-300 mb-4">🏢 {t("roadmapTitle")}</h2>
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
                    <div className="text-slate-500">{t("visitors")}</div>
                    <div className="text-white font-bold">{b.visitors}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">{t("nights")}</div>
                    <div className="text-white font-bold">{b.nights}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">{t("station")}</div>
                    <div className="text-blue-300 font-bold text-[10px]">{b.station}</div>
                  </div>
                </div>
                <span className="shrink-0 text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 font-bold self-start md:self-auto">
                  {t("whyBtn")}
                </span>
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
                {t("modalClose")}
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">✈ {t("airport")}</div>
                <div className="text-sm text-white font-bold">{modal.airport}</div>
                <div className="text-xs text-slate-400 mt-0.5">{modal.airportPax}</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">📦 {t("zone")}</div>
                <div className="text-sm text-white">{modal.zone}</div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-blue-800/50">
                <div className="text-xs text-blue-400 mb-1 font-bold">💡 {t("strat")}</div>
                <div className="text-sm text-slate-200 leading-relaxed">
                  {lang === "zh" ? modal.whyZh : lang === "ko" ? modal.whyKo : modal.why}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: t("visitors"), val: modal.visitors },
                  { label: t("nights"), val: modal.nights },
                  { label: t("station"), val: modal.station },
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
