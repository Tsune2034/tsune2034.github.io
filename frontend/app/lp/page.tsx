"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Locale = "en" | "ja" | "zh" | "ko";

const copy: Record<Locale, {
  badge: string; hero: string; sub: string; cta: string;
  kairos_label: string; kairos_body: string;
  prob_title: string;
  prob1_title: string; prob1_body: string;
  prob2_title: string; prob2_body: string;
  prob3_title: string; prob3_body: string;
  sol_title: string; sol_body: string;
  reviews_title: string;
  how_title: string;
  step1_title: string; step1_body: string;
  step2_title: string; step2_body: string;
  step3_title: string; step3_body: string;
  price_title: string; price_note: string;
  sim_title: string; sim_sub: string;
  sim_from: string; sim_to: string; sim_bags: string;
  sim_total: string; sim_note: string; sim_book: string;
  narita_label: string; chitose_label: string;
  area_title: string; area_body: string;
  cta2: string; cta2_sub: string;
  footer_company: string; footer_service: string;
}> = {
  ja: {
    badge: "Uber × 急配 × AI — 北海道・千歳・成田",
    hero: "その荷物、\n絶好のタイミングで届ける。",
    sub: "KAIROXは、リアルとデジタルを融合させた\n急行荷物配送プラットフォームです。",
    cta: "今すぐ予約する",
    kairos_label: "なぜ KAIROX？",
    kairos_body: "ギリシャ語「カイロス」は、流れる時間（クロノス）とは違う——\n絶好のタイミング、好機を意味する言葉。\nKAIROX = Kairos（好機）+ X（急行）。\n旅の一番大切な瞬間を、荷物の重さで無駄にしない。",
    prob_title: "旅行者が抱える、3つの課題",
    prob1_title: "重い荷物", prob1_body: "スーツケースを引きながらの観光は、体力も時間も消耗する。",
    prob2_title: "チェックイン待ち", prob2_body: "ホテルに荷物を預けられず、半日を無駄に過ごしてしまう。",
    prob3_title: "言語の壁", prob3_body: "日本語が読めない外国人旅行者には、既存サービスは使えない。",
    sol_title: "KAIROXの答え",
    sol_body: "AIが最適ルートを計算し、アプリで予約、スポットで集荷、ホテルに届ける。\n4言語対応、相乗りで割安、分単位の時間保証。",
    reviews_title: "旅行者の声",
    how_title: "3ステップで完結",
    step1_title: "① アプリで予約", step1_body: "30秒で完了。スロット選択・相乗り設定・支払いまで全てアプリで。",
    step2_title: "② スポットで集荷", step2_body: "空港・ホテル・観光地の指定スポットでドライバーが受け取り。",
    step3_title: "③ ホテルに届く", step3_body: "追跡アプリでリアルタイム確認。千歳・札幌は最短60〜75分、小樽は当日中にお届け。",
    price_title: "シンプルな料金",
    price_note: "相乗りで最大15%OFF。燃油サーチャージ（¥500）込み。",
    sim_title: "料金シミュレーター",
    sim_sub: "出発地・目的地・荷物数を選んで即時見積もり",
    sim_from: "出発空港", sim_to: "目的地", sim_bags: "荷物の数（個）",
    sim_total: "概算合計", sim_note: "燃油サーチャージ（¥500）込み・税別",
    sim_book: "この料金で予約する",
    narita_label: "成田空港", chitose_label: "新千歳空港",
    area_title: "対応エリア",
    area_body: "新千歳空港 / 千歳・苫小牧 / 札幌 / 小樽 / 成田空港 / 東京都心　｜　ニセコ・富良野・函館 展開予定",
    cta2: "手ぶらで、日本を全力で楽しもう。",
    cta2_sub: "予約は30秒。今すぐ始める。",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROXはOne Hour Value Inc.が運営するサービスです。",
  },
  en: {
    badge: "Uber × Express × AI — Hokkaido & Narita, Japan",
    hero: "Your luggage,\ndelivered at the perfect moment.",
    sub: "KAIROX is a real-world AI-powered\nexpress luggage delivery platform.",
    cta: "Book Now",
    kairos_label: "Why KAIROX?",
    kairos_body: "In ancient Greek, Kairos means not the flow of time (Chronos),\nbut the perfect, opportune moment.\nKAIROX = Kairos (perfect timing) + X (express).\nDon't waste the best moments of your trip carrying heavy bags.",
    prob_title: "3 problems every traveler faces",
    prob1_title: "Heavy luggage", prob1_body: "Dragging suitcases through sightseeing drains your energy and time.",
    prob2_title: "Early check-in wait", prob2_body: "Hotels won't take your bags early — so half your day is wasted.",
    prob3_title: "Language barrier", prob3_body: "Most Japanese delivery services are Japanese-only. No help for foreign visitors.",
    sol_title: "The KAIROX answer",
    sol_body: "AI calculates the optimal route. Book in the app, drop off at a spot, delivered to your hotel.\n4 languages, shared rides for lower cost, minute-level time guarantees.",
    reviews_title: "What travelers say",
    how_title: "3 simple steps",
    step1_title: "① Book in the app", step1_body: "Done in 30 seconds. Pick your slot, share a ride, and pay — all in the app.",
    step2_title: "② Drop off at a spot", step2_body: "Hand your bags to the driver at a designated spot at the airport, hotel, or attraction.",
    step3_title: "③ Arrives at your hotel", step3_body: "Track in real time. Chitose & Sapporo: from 60–75 min. Otaru: same-day delivery.",
    price_title: "Simple pricing",
    price_note: "Up to 15% off with shared rides. Fuel surcharge (¥500) included.",
    sim_title: "Price Simulator",
    sim_sub: "Choose departure, destination & bags — instant estimate",
    sim_from: "Departure airport", sim_to: "Destination", sim_bags: "Number of bags",
    sim_total: "Estimated total", sim_note: "Incl. fuel surcharge (¥500) · excl. tax",
    sim_book: "Book at this price",
    narita_label: "Narita Airport", chitose_label: "New Chitose Airport",
    area_title: "Service areas",
    area_body: "New Chitose Airport / Chitose / Sapporo / Otaru / Narita Airport / Tokyo  |  Niseko, Furano & Hakodate: coming soon",
    cta2: "Go hands-free. Enjoy Japan fully.",
    cta2_sub: "Book in 30 seconds.",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROX is a service operated by One Hour Value Inc.",
  },
  zh: {
    badge: "Uber × 急配 × AI — 北海道・千歲・成田",
    hero: "您的行李，\n在最佳時機送達。",
    sub: "KAIROX 是融合現實與數位的\n急速行李配送平台。",
    cta: "立即預訂",
    kairos_label: "為何叫 KAIROX？",
    kairos_body: "古希臘語「Kairos」代表的不是流逝的時間，\n而是最佳時機、千載難逢的好機會。\nKAIROX = Kairos（好機）+ X（急行）。\n不讓行李的重量浪費旅途中最珍貴的瞬間。",
    prob_title: "每位旅客面對的 3 個難題",
    prob1_title: "沉重的行李", prob1_body: "拖著行李箱觀光，既耗體力又浪費時間。",
    prob2_title: "等待入住", prob2_body: "飯店無法提早收行李，半天就這樣白白浪費。",
    prob3_title: "語言障礙", prob3_body: "現有日本配送服務幾乎都是日文介面，外國旅客根本無法使用。",
    sol_title: "KAIROX 的解答",
    sol_body: "AI 計算最佳路線，App 預訂、指定地點交件、配送至飯店。\n4 種語言、共乘享折扣、分鐘級時間保證。",
    reviews_title: "旅客評價",
    how_title: "3 個步驟完成",
    step1_title: "① App 預訂", step1_body: "30 秒完成。選擇時段、共乘設定、付款，全在 App 內完成。",
    step2_title: "② 指定地點交件", step2_body: "在機場、飯店或景點的指定地點，將行李交給司機。",
    step3_title: "③ 送達飯店", step3_body: "即時追蹤。千歲・札幌最快60〜75分，小樽當日送達。",
    price_title: "簡單明瞭的收費",
    price_note: "共乘最高享 15% 折扣。含燃油附加費（¥500）。",
    sim_title: "費用試算",
    sim_sub: "選擇出發地、目的地和行李件數，即時試算費用",
    sim_from: "出發機場", sim_to: "目的地", sim_bags: "行李件數",
    sim_total: "預估合計", sim_note: "含燃油附加費（¥500）・未稅",
    sim_book: "以此費用預訂",
    narita_label: "成田機場", chitose_label: "新千歲機場",
    area_title: "服務範圍",
    area_body: "新千歲機場 / 千歲・苫小牧 / 札幌 / 小樽 / 成田機場 / 東京　｜　ニセコ・富良野・函館 即將開通",
    cta2: "輕裝上陣，盡情享受日本。",
    cta2_sub: "30 秒即可預訂。",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROX 為 One Hour Value Inc. 旗下服務。",
  },
  ko: {
    badge: "Uber × 특급배송 × AI — 홋카이도・나리타",
    hero: "당신의 짐,\n최적의 타이밍에 배달합니다.",
    sub: "KAIROX는 현실과 디지털을 융합한\n특급 수하물 배송 플랫폼입니다.",
    cta: "지금 예약하기",
    kairos_label: "왜 KAIROX인가?",
    kairos_body: "그리스어 'Kairos'는 흘러가는 시간(Chronos)이 아닌\n최적의 순간, 절호의 기회를 의미합니다.\nKAIROX = Kairos(절호의 기회) + X(특급).\n여행의 가장 소중한 순간을 짐 때문에 낭비하지 마세요.",
    prob_title: "여행자가 겪는 3가지 문제",
    prob1_title: "무거운 짐", prob1_body: "캐리어를 끌고 관광하면 체력과 시간이 모두 소진됩니다.",
    prob2_title: "체크인 대기", prob2_body: "호텔에 짐을 맡기지 못해 반나절을 낭비하게 됩니다.",
    prob3_title: "언어 장벽", prob3_body: "일본어를 모르는 외국인 여행자는 기존 배송 서비스를 이용할 수 없습니다.",
    sol_title: "KAIROX의 해답",
    sol_body: "AI가 최적 경로를 계산하고, 앱으로 예약, 지정 장소에서 픽업, 호텔로 배달.\n4개 언어 지원, 카풀로 할인, 분 단위 시간 보장.",
    reviews_title: "여행자 후기",
    how_title: "3단계로 완료",
    step1_title: "① 앱으로 예약", step1_body: "30초 완료. 슬롯 선택, 카풀 설정, 결제까지 모두 앱에서.",
    step2_title: "② 지정 장소에서 픽업", step2_body: "공항, 호텔, 관광지의 지정 장소에서 드라이버가 수령.",
    step3_title: "③ 호텔로 배달", step3_body: "실시간 추적 가능. 치토세・삿포로 최단 60〜75분, 오타루 당일 배달.",
    price_title: "간단한 요금",
    price_note: "카풀 이용 시 최대 15% 할인. 연료 할증료（¥500）포함.",
    sim_title: "요금 시뮬레이터",
    sim_sub: "출발지・목적지・수하물 수를 선택하면 즉시 견적",
    sim_from: "출발 공항", sim_to: "목적지", sim_bags: "수하물 수（개）",
    sim_total: "예상 합계", sim_note: "연료 할증료（¥500）포함・세금 별도",
    sim_book: "이 요금으로 예약하기",
    narita_label: "나리타공항", chitose_label: "신치토세공항",
    area_title: "서비스 지역",
    area_body: "신치토세공항 / 치토세・도마코마이 / 삿포로 / 오타루 / 나리타공항 / 도쿄　｜　니세코・후라노・하코다테 서비스 예정",
    cta2: "빈손으로, 일본을 마음껏 즐기세요.",
    cta2_sub: "예약은 30초. 지금 시작하세요.",
    footer_company: "One Hour Value Inc.",
    footer_service: "KAIROX는 One Hour Value Inc.가 운영하는 서비스입니다.",
  },
};

// 参考市場価格（2024実勢）:
// 成田→東京: JAL ABC ¥1,950〜、ヤマト ¥2,510 ← KAIROX = 即日AI急行、50-80%プレミアム
// 新千歳→札幌: うさぎカーゴ ¥1,800、エアポーター ¥1,870 ← 同左
const SIMULATOR = {
  narita: {
    destinations: [
      { label: "東京都心（新宿・渋谷・銀座）", base: 3000 },
      { label: "浅草・上野・秋葉原",           base: 3000 },
      { label: "横浜",                         base: 4000 },
      { label: "千葉市内",                     base: 2500 },
    ],
  },
  chitose: {
    destinations: [
      { label: "札幌（中心部）", base: 2800 },
      { label: "小樽",          base: 4200 },
    ],
  },
} as const;
type SimFrom = keyof typeof SIMULATOR;

const BAG_FACTORS = [1.0, 1.55, 2.0, 2.45, 2.9];
const FUEL = 500;
function calcPrice(base: number, bags: number): number {
  const factor = BAG_FACTORS[Math.min(bags - 1, 4)];
  return Math.round((base * factor + FUEL) / 100) * 100;
}

const REVIEWS_BY_COUNTRY = [
  {
    country: "🇺🇸 USA / Australia",
    items: [
      { name: "Sarah M.", rating: 5, text: "Saved our whole trip! Bags arrived at the hotel before we even finished sightseeing in Shinjuku.", date: "Jan 2025" },
      { name: "James T.", rating: 5, text: "Dead simple booking, zero stress. Narita to Shibuya hotel in under 3 hours. Brilliant service.", date: "Feb 2025" },
    ],
  },
  {
    country: "🇰🇷 Korea",
    items: [
      { name: "김민준", rating: 5, text: "짐 없이 홋카이도 여행! 예약도 쉽고 배달도 빨랐어요. 4개 국어 지원 덕분에 전혀 불편함 없었어요 👍", date: "Mar 2025" },
      { name: "이수진", rating: 5, text: "나리타에서 신주쿠 호텔까지 짐 배송. 너무 편했어요. 다음 일본 여행에도 꼭 쓸 거예요!", date: "Jan 2025" },
    ],
  },
  {
    country: "🇹🇼 Taiwan / 🇨🇳 China",
    items: [
      { name: "李佳穎", rating: 5, text: "行李直接送到飯店，輕鬆遊北海道！App很好用，中文支援超貼心，完全不用擔心語言問題。", date: "Mar 2025" },
      { name: "王浩然", rating: 5, text: "从成田机场到酒店的行李配送，价格合理，速度快。下次还会用！强烈推荐。", date: "Feb 2025" },
    ],
  },
  {
    country: "🇯🇵 Japan",
    items: [
      { name: "田中健太", rating: 5, text: "成田からスキー場まで荷物を送ってもらいました。スキー板も受け付けてくれて感動。最高すぎる！", date: "Feb 2025" },
      { name: "佐藤美咲", rating: 5, text: "富良野ラベンダー旅行で利用。大荷物のまま観光できてとても楽でした。また使います！", date: "Jul 2025" },
    ],
  },
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "EN" },
  { value: "zh", label: "繁中" },
  { value: "ko", label: "한국어" },
];

const PLANS = [
  { icon: "🧳",       label: "Solo",   ja: "ソロ",      price: "¥3,500〜" },
  { icon: "🧳🧳",     label: "Pair",   ja: "ペア",      price: "¥6,000〜" },
  { icon: "🧳🧳🧳🧳", label: "Family", ja: "ファミリー", price: "¥10,000〜" },
];

// Tailwind gradient shorthand helpers (string literals for purge safety)
const BTN_PRIMARY = "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md shadow-blue-200";
const BTN_ACTIVE  = "bg-gradient-to-r from-blue-600 to-cyan-500 text-white";

export default function LPPage() {
  const [locale, setLocale] = useState<Locale>("ja");
  const [simFrom, setSimFrom] = useState<SimFrom>("narita");
  const [simDest, setSimDest] = useState(0);
  const [simBags, setSimBags] = useState(1);
  const tr = copy[locale];
  const simPrice = calcPrice(SIMULATOR[simFrom].destinations[simDest].base, simBags);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-widest bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">
              KAIROX
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-500">β</span>
          </div>
          <div className="flex items-center gap-1">
            {LOCALES.map((l) => (
              <button key={l.value} onClick={() => setLocale(l.value)}
                className={`px-2 py-1 rounded-md text-xs transition-all font-medium ${locale === l.value ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                {l.label}
              </button>
            ))}
            <Link href="/"
              className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${BTN_PRIMARY}`}>
              {tr.cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* 右上 blue glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100 via-cyan-50 to-transparent rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-5 pt-14 pb-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* テキスト */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs text-blue-600 mb-6 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {tr.badge}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5 text-slate-900 whitespace-pre-line">
                {tr.hero.split("\n")[0]}
                <br />
                <span className="bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">
                  {tr.hero.split("\n")[1]}
                </span>
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed whitespace-pre-line mb-8">{tr.sub}</p>
              <Link href="/"
                className={`inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 ${BTN_PRIMARY}`}>
                {tr.cta} <span className="text-lg">→</span>
              </Link>
            </div>
            {/* ロゴ */}
            <div className="flex justify-center md:justify-end">
              <Image
                src="/icon-512.png"
                alt="KAIROX Japan"
                width={300}
                height={300}
                className="drop-shadow-xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Kairos brand story ── */}
      <section className="bg-slate-50">
        <div className="max-w-2xl mx-auto px-5 py-12">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-6 sm:p-8">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">{tr.kairos_label}</p>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">{tr.kairos_body}</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-blue-200" />
              <span className="text-2xl font-black bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent tracking-widest">KAIROX</span>
              <div className="flex-1 h-px bg-blue-200" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-slate-900">{tr.prob_title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "😰", title: tr.prob1_title, body: tr.prob1_body },
            { icon: "⏳", title: tr.prob2_title, body: tr.prob2_body },
            { icon: "🌐", title: tr.prob3_title, body: tr.prob3_body },
          ].map((p, i) => (
            <div key={i} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{p.icon}</div>
              <p className="text-sm font-bold text-slate-800 mb-2">{p.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Solution ── */}
      <section className="bg-slate-50">
        <div className="max-w-2xl mx-auto px-5 py-12">
          <h2 className="text-xl font-bold text-center mb-6 text-slate-900">{tr.sol_title}</h2>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {["Uber", "×", "急配", "×", "AI"].map((w, i) => (
              <span key={i} className={`${w === "×" ? "text-slate-400 text-xl font-light self-center" : "px-4 py-2 rounded-xl border text-sm font-bold " + (w === "AI" ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-blue-200 bg-blue-50 text-blue-700")}`}>
                {w}
              </span>
            ))}
          </div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line text-center">{tr.sol_body}</p>
        </div>
      </section>

      {/* ── Reviews（国別）── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-slate-900">{tr.reviews_title}</h2>
        <div className="space-y-6">
          {REVIEWS_BY_COUNTRY.map((group) => (
            <div key={group.country}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-blue-600">{group.country}</span>
                <div className="flex-1 h-px bg-blue-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.items.map((r, i) => (
                  <div key={i} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800">{r.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-500 text-xs">{"★".repeat(r.rating)}</span>
                        <span className="text-[10px] text-slate-400">{r.date}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-slate-50">
        <div className="max-w-2xl mx-auto px-5 py-12">
          <h2 className="text-xl font-bold text-center mb-8 text-slate-900">{tr.how_title}</h2>
          <div className="space-y-4">
            {[
              { emoji: "📱", title: tr.step1_title, body: tr.step1_body },
              { emoji: "🤝", title: tr.step2_title, body: tr.step2_body },
              { emoji: "🏨", title: tr.step3_title, body: tr.step3_body },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-4 bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-4">
                <span className="text-3xl flex-shrink-0 mt-0.5">{s.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-blue-600 mb-1">{s.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-slate-900">{tr.price_title}</h2>
        <div className="grid grid-cols-3 gap-3">
          {PLANS.map((p) => (
            <div key={p.label} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">{p.icon}</div>
              <p className="text-xs font-bold text-slate-700 mb-0.5">{locale === "ja" ? p.ja : p.label}</p>
              <p className="text-lg font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{p.price}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">{tr.price_note}</p>
      </section>

      {/* ── Simulator ── */}
      <section className="bg-slate-50">
        <div className="max-w-2xl mx-auto px-5 py-12">
          <h2 className="text-xl font-bold text-center mb-2 text-slate-900">💰 {tr.sim_title}</h2>
          <p className="text-center text-xs text-slate-400 mb-6">{tr.sim_sub}</p>
          <div className="bg-white border border-blue-100 shadow-sm rounded-2xl p-5 space-y-4">

            {/* 出発空港 */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">{tr.sim_from}</p>
              <div className="flex gap-2">
                {(["narita", "chitose"] as const).map((f) => (
                  <button key={f} onClick={() => { setSimFrom(f); setSimDest(0); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${simFrom === f ? BTN_ACTIVE : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    ✈ {f === "narita" ? tr.narita_label : tr.chitose_label}
                  </button>
                ))}
              </div>
            </div>

            {/* 目的地 */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">{tr.sim_to}</p>
              <select value={simDest} onChange={e => setSimDest(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200">
                {SIMULATOR[simFrom].destinations.map((d, i) => (
                  <option key={i} value={i}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* 荷物数 */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">{tr.sim_bags}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setSimBags(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${simBags === n ? BTN_ACTIVE : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* 結果 */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-xs text-slate-500 mb-1 font-medium">{tr.sim_total}</div>
              <div className="text-4xl font-black bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">
                ¥{simPrice.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{tr.sim_note}</div>
            </div>

            <Link href="/"
              className={`block text-center py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 ${BTN_PRIMARY}`}>
              {tr.sim_book} →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Area ── */}
      <section className="max-w-2xl mx-auto px-5 py-8">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-6 py-5 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{tr.area_title}</p>
          <p className="text-sm text-slate-600 leading-relaxed">📍 {tr.area_body}</p>
          <Link href="/map" className="inline-block mt-3 text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 font-medium">
            拠点マップを見る →
          </Link>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gradient-to-br from-slate-900 to-blue-950 py-20 text-white text-center px-5">
        <div className="max-w-2xl mx-auto relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-blue-500/20 rounded-full blur-[80px]" />
          </div>
          <h2 className="relative text-2xl sm:text-3xl font-black mb-3 whitespace-pre-line">{tr.cta2}</h2>
          <p className="text-slate-400 text-sm mb-8">{tr.cta2_sub}</p>
          <Link href="/"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold text-base hover:from-blue-600 hover:to-cyan-500 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-blue-500/30">
            {tr.cta} <span className="text-lg">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-50 border-t border-slate-100 max-w-full px-5 py-8 text-center space-y-2">
        <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">{tr.footer_company}</p>
        <p className="text-[10px] text-slate-400">{tr.footer_service}</p>
        <p className="text-[10px] text-slate-300">© 2026 One Hour Value Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
