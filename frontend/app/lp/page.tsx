"use client";

import { useState } from "react";
import Link from "next/link";

type Locale = "en" | "ja" | "zh" | "ko";

const copy: Record<Locale, {
  badge: string;
  hero: string;
  sub: string;
  cta: string;
  kairos_label: string;
  kairos_body: string;
  prob_title: string;
  prob1_title: string; prob1_body: string;
  prob2_title: string; prob2_body: string;
  prob3_title: string; prob3_body: string;
  sol_title: string;
  sol_body: string;
  how_title: string;
  step1_title: string; step1_body: string;
  step2_title: string; step2_body: string;
  step3_title: string; step3_body: string;
  price_title: string;
  price_note: string;
  area_title: string;
  area_body: string;
  cta2: string;
  cta2_sub: string;
  footer_company: string;
  footer_service: string;
}> = {
  ja: {
    badge: "Uber × ヤマト × AI — 北海道・千歳",
    hero: "その荷物、\n絶好のタイミングで届ける。",
    sub: "KAIROXは、リアルとデジタルを融合させた\n急行荷物配送プラットフォームです。",
    cta: "今すぐ予約する",
    kairos_label: "なぜ KAIROX？",
    kairos_body: "ギリシャ語「カイロス」は、流れる時間（クロノス）とは違う——\n絶好のタイミング、好機を意味する言葉。\nKAIROX = Kairos（好機）+ X（急行）。\n旅の一番大切な瞬間を、荷物の重さで無駄にしない。",
    prob_title: "旅行者が抱える、3つの課題",
    prob1_title: "重い荷物",
    prob1_body: "スーツケースを引きながらの観光は、体力も時間も消耗する。",
    prob2_title: "チェックイン待ち",
    prob2_body: "ホテルに荷物を預けられず、半日を無駄に過ごしてしまう。",
    prob3_title: "言語の壁",
    prob3_body: "日本語が読めない外国人旅行者には、既存サービスは使えない。",
    sol_title: "KAIROXの答え",
    sol_body: "AIが最適ルートを計算し、アプリで予約、スポットで集荷、ホテルに届ける。\n4言語対応、相乗りで割安、分単位の時間保証。\nこれはSaaSではない——リアル × デジタルのハイブリッドで動く、\n北海道初の急行配送プラットフォームです。",
    how_title: "3ステップで完結",
    step1_title: "①　アプリで予約",
    step1_body: "30秒で完了。スロット選択・相乗り設定・支払いまで全てアプリで。",
    step2_title: "②　スポットで集荷",
    step2_body: "空港・ホテル・観光地の指定スポットでドライバーが受け取り。",
    step3_title: "③　ホテルに届く",
    step3_body: "追跡アプリでリアルタイム確認。千歳・札幌は最短60〜75分、小樽・富良野は当日中にお届け。",
    price_title: "シンプルな料金",
    price_note: "相乗りで最大15%OFF。GPS割引・急行保証料など詳細はアプリで。",
    area_title: "対応エリア",
    area_body: "新千歳空港 / 千歳・苫小牧 / 札幌 / 小樽 / 富良野・美瑛（旭川空港経由）",
    cta2: "手ぶらで、北海道を全力で楽しもう。",
    cta2_sub: "予約は30秒。今すぐ始める。",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROXはOne Hour Value Inc.が運営するサービスです。",
  },
  en: {
    badge: "Uber × Yamato × AI — Hokkaido, Japan",
    hero: "Your luggage,\ndelivered at the perfect moment.",
    sub: "KAIROX is a real-world AI-powered\nexpress luggage delivery platform.",
    cta: "Book Now",
    kairos_label: "Why KAIROX?",
    kairos_body: "In ancient Greek, Kairos means not the flow of time (Chronos),\nbut the perfect, opportune moment.\nKAIROX = Kairos (perfect timing) + X (express).\nDon't waste the best moments of your trip carrying heavy bags.",
    prob_title: "3 problems every traveler faces",
    prob1_title: "Heavy luggage",
    prob1_body: "Dragging suitcases through sightseeing drains your energy and time.",
    prob2_title: "Early check-in wait",
    prob2_body: "Hotels won't take your bags early — so half your day is wasted.",
    prob3_title: "Language barrier",
    prob3_body: "Most Japanese delivery services are Japanese-only. No help for foreign visitors.",
    sol_title: "The KAIROX answer",
    sol_body: "AI calculates the optimal route. Book in the app, drop off at a spot, delivered to your hotel.\n4 languages, shared rides for lower cost, minute-level time guarantees.\nThis is not SaaS — it's a real × digital hybrid, Hokkaido's first express delivery platform.",
    how_title: "3 simple steps",
    step1_title: "① Book in the app",
    step1_body: "Done in 30 seconds. Pick your slot, share a ride, and pay — all in the app.",
    step2_title: "② Drop off at a spot",
    step2_body: "Hand your bags to the driver at a designated spot at the airport, hotel, or attraction.",
    step3_title: "③ Arrives at your hotel",
    step3_body: "Track in real time. Chitose & Sapporo: from 60–75 min. Otaru & Furano: same-day delivery.",
    price_title: "Simple pricing",
    price_note: "Up to 15% off with shared rides. GPS discount & express fee details in the app.",
    area_title: "Service areas",
    area_body: "New Chitose Airport / Chitose / Sapporo / Otaru / Furano & Biei (via Asahikawa Airport)",
    cta2: "Go hands-free. Enjoy Hokkaido fully.",
    cta2_sub: "Book in 30 seconds.",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROX is a service operated by One Hour Value Inc.",
  },
  zh: {
    badge: "Uber × 大和 × AI — 北海道・千歲",
    hero: "您的行李，\n在最佳時機送達。",
    sub: "KAIROX 是融合現實與數位的\n急速行李配送平台。",
    cta: "立即預訂",
    kairos_label: "為何叫 KAIROX？",
    kairos_body: "古希臘語「Kairos」代表的不是流逝的時間，\n而是最佳時機、千載難逢的好機會。\nKAIROX = Kairos（好機）+ X（急行）。\n不讓行李的重量浪費旅途中最珍貴的瞬間。",
    prob_title: "每位旅客面對的 3 個難題",
    prob1_title: "沉重的行李",
    prob1_body: "拖著行李箱觀光，既耗體力又浪費時間。",
    prob2_title: "等待入住",
    prob2_body: "飯店無法提早收行李，半天就這樣白白浪費。",
    prob3_title: "語言障礙",
    prob3_body: "現有日本配送服務幾乎都是日文介面，外國旅客根本無法使用。",
    sol_title: "KAIROX 的解答",
    sol_body: "AI 計算最佳路線，App 預訂、指定地點交件、配送至飯店。\n4 種語言、共乘享折扣、分鐘級時間保證。",
    how_title: "3 個步驟完成",
    step1_title: "① App 預訂",
    step1_body: "30 秒完成。選擇時段、共乘設定、付款，全在 App 內完成。",
    step2_title: "② 指定地點交件",
    step2_body: "在機場、飯店或景點的指定地點，將行李交給司機。",
    step3_title: "③ 送達飯店",
    step3_body: "即時追蹤。千歲・札幌最快60〜75分，小樽・富良野當日送達。",
    price_title: "簡單明瞭的收費",
    price_note: "共乘最高享 15% 折扣。GPS 折扣及急行費詳情請見 App。",
    area_title: "服務範圍",
    area_body: "新千歲機場 / 千歲・苫小牧 / 札幌 / 小樽 / 富良野・美瑛（旭川機場）",
    cta2: "輕裝上陣，盡情享受北海道。",
    cta2_sub: "30 秒即可預訂。",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROX 為 One Hour Value Inc. 旗下服務。",
  },
  ko: {
    badge: "Uber × 야마토 × AI — 홋카이도・치토세",
    hero: "당신의 짐,\n최적의 타이밍에 배달합니다.",
    sub: "KAIROX는 현실과 디지털을 융합한\n특급 수하물 배송 플랫폼입니다.",
    cta: "지금 예약하기",
    kairos_label: "왜 KAIROX인가?",
    kairos_body: "그리스어 'Kairos'는 흘러가는 시간(Chronos)이 아닌\n최적의 순간, 절호의 기회를 의미합니다.\nKAIROX = Kairos(절호의 기회) + X(특급).\n여행의 가장 소중한 순간을 짐 때문에 낭비하지 마세요.",
    prob_title: "여행자가 겪는 3가지 문제",
    prob1_title: "무거운 짐",
    prob1_body: "캐리어를 끌고 관광하면 체력과 시간이 모두 소진됩니다.",
    prob2_title: "체크인 대기",
    prob2_body: "호텔에 짐을 맡기지 못해 반나절을 낭비하게 됩니다.",
    prob3_title: "언어 장벽",
    prob3_body: "일본어를 모르는 외국인 여행자는 기존 배송 서비스를 이용할 수 없습니다.",
    sol_title: "KAIROX의 해답",
    sol_body: "AI가 최적 경로를 계산하고, 앱으로 예약, 지정 장소에서 픽업, 호텔로 배달.\n4개 언어 지원, 카풀로 할인, 분 단위 시간 보장.",
    how_title: "3단계로 완료",
    step1_title: "① 앱으로 예약",
    step1_body: "30초 완료. 슬롯 선택, 카풀 설정, 결제까지 모두 앱에서.",
    step2_title: "② 지정 장소에서 픽업",
    step2_body: "공항, 호텔, 관광지의 지정 장소에서 드라이버가 수령.",
    step3_title: "③ 호텔로 배달",
    step3_body: "실시간 추적 가능. 치토세・삿포로 최단 60〜75분, 오타루・후라노 당일 배달.",
    price_title: "간단한 요금",
    price_note: "카풀 이용 시 최대 15% 할인. GPS 할인 및 특급 요금 상세는 앱에서 확인.",
    area_title: "서비스 지역",
    area_body: "신치토세공항 / 치토세・도마코마이 / 삿포로 / 오타루 / 후라노・비에이（아사히카와공항）",
    cta2: "빈손으로, 홋카이도를 마음껏 즐기세요.",
    cta2_sub: "예약은 30초. 지금 시작하세요.",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROX는 One Hour Value Inc.가 운영하는 서비스입니다.",
  },
};

const LOCALES: { value: Locale; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "EN" },
  { value: "zh", label: "繁中" },
  { value: "ko", label: "한국어" },
];

const PLANS = [
  { icon: "🧳",       label: "Solo",   ja: "ソロ",   price: "¥3,500〜" },
  { icon: "🧳🧳",     label: "Pair",   ja: "ペア",   price: "¥6,000〜" },
  { icon: "🧳🧳🧳🧳", label: "Family", ja: "ファミリー", price: "¥10,000〜" },
];

export default function LPPage() {
  const [locale, setLocale] = useState<Locale>("ja");
  const tr = copy[locale];

  return (
    <div className="min-h-screen bg-[#080C18] text-white font-sans">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 bg-[#080C18]/90 backdrop-blur border-b border-white/5">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold tracking-widest text-white">KAIROX</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
              β
            </span>
          </div>
          <div className="flex items-center gap-1">
            {LOCALES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLocale(l.value)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${
                  locale === l.value
                    ? "bg-amber-500 text-gray-950 font-semibold"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {l.label}
              </button>
            ))}
            <Link
              href="/"
              className="ml-2 px-3 py-1.5 rounded-lg bg-amber-500 text-gray-950 text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              {tr.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-2xl mx-auto px-5 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {tr.badge}
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-6 whitespace-pre-line">
            {tr.hero.split("\n")[0]}
            <br />
            <span className="text-amber-400">{tr.hero.split("\n")[1]}</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base leading-relaxed whitespace-pre-line mb-10">
            {tr.sub}
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-amber-500 text-gray-950 font-bold text-base hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30"
          >
            {tr.cta}
            <span className="text-lg">→</span>
          </Link>
        </div>
      </section>

      {/* ── Kairos brand story ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <div className="bg-gradient-to-br from-amber-950/30 to-amber-900/10 border border-amber-500/20 rounded-2xl p-6 sm:p-8">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">
            {tr.kairos_label}
          </p>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {tr.kairos_body}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-amber-500/20" />
            <span className="text-2xl font-black text-amber-400 tracking-widest">KAIROX</span>
            <div className="flex-1 h-px bg-amber-500/20" />
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-white">{tr.prob_title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "😰", title: tr.prob1_title, body: tr.prob1_body },
            { icon: "⏳", title: tr.prob2_title, body: tr.prob2_body },
            { icon: "🌐", title: tr.prob3_title, body: tr.prob3_body },
          ].map((p, i) => (
            <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
              <div className="text-3xl mb-3">{p.icon}</div>
              <p className="text-sm font-bold text-white mb-2">{p.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-2">{tr.sol_title}</h2>
        </div>
        {/* Uber × Yamato × AI badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {["Uber", "×", "ヤマト", "×", "AI"].map((w, i) => (
            <span
              key={i}
              className={`${
                w === "×"
                  ? "text-gray-600 text-xl font-light self-center"
                  : "px-4 py-2 rounded-xl border text-sm font-bold " +
                    (w === "AI"
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-300")
              }`}
            >
              {w}
            </span>
          ))}
        </div>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed whitespace-pre-line text-center">
          {tr.sol_body}
        </p>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-white">{tr.how_title}</h2>
        <div className="space-y-4">
          {[
            { emoji: "📱", title: tr.step1_title, body: tr.step1_body },
            { emoji: "🤝", title: tr.step2_title, body: tr.step2_body },
            { emoji: "🏨", title: tr.step3_title, body: tr.step3_body },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-4 bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4">
              <span className="text-3xl flex-shrink-0 mt-0.5">{s.emoji}</span>
              <div>
                <p className="text-sm font-bold text-amber-300 mb-1">{s.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-white">{tr.price_title}</h2>
        <div className="grid grid-cols-3 gap-3">
          {PLANS.map((p) => (
            <div key={p.label} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-2">{p.icon}</div>
              <p className="text-xs font-bold text-white mb-0.5">
                {locale === "ja" ? p.ja : p.label}
              </p>
              <p className="text-lg font-black text-amber-400">{p.price}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">{tr.price_note}</p>
      </section>

      {/* ── Area ── */}
      <section className="max-w-2xl mx-auto px-5 py-8">
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl px-6 py-5 text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            {tr.area_title}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            📍 {tr.area_body}
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-amber-500/10 rounded-full blur-[80px]" />
          </div>
          <h2 className="relative text-2xl sm:text-3xl font-black mb-3 whitespace-pre-line">
            {tr.cta2}
          </h2>
          <p className="text-gray-400 text-sm mb-8">{tr.cta2_sub}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-amber-500 text-gray-950 font-bold text-base hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
          >
            {tr.cta}
            <span className="text-lg">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 max-w-2xl mx-auto px-5 py-8 text-center space-y-2">
        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">
          {tr.footer_company}
        </p>
        <p className="text-[10px] text-gray-700">{tr.footer_service}</p>
        <p className="text-[10px] text-gray-800">© 2026 One Hour Value Inc. All rights reserved.</p>
      </footer>

    </div>
  );
}
