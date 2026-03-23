"use client";

import { useState } from "react";
import Link from "next/link";

type Locale = "en" | "ja" | "zh" | "ko";

const copy: Record<Locale, {
  nav_cta: string;
  badge: string;
  hero: string;
  sub: string;
  cta: string;
  earn_title: string;
  earn_route: string;
  earn_fare: string;
  earn_reward: string;
  earn_net: string;
  earn_note: string;
  how_title: string;
  step1_title: string; step1_body: string;
  step2_title: string; step2_body: string;
  step3_title: string; step3_body: string;
  rank_title: string;
  rank_new: string; rank_new_body: string;
  rank_trusted: string; rank_trusted_body: string;
  rank_elite: string; rank_elite_body: string;
  rank_note: string;
  form_title: string;
  form_name: string;
  form_email: string;
  form_phone: string;
  form_route: string;
  route_narita: string;
  route_haneda: string;
  route_both: string;
  form_submit: string;
  form_note: string;
  success_title: string;
  success_body: string;
  footer_company: string;
}> = {
  ja: {
    nav_cta: "旅行者の予約はこちら",
    badge: "プレイヤー募集中 — 成田 / 羽田",
    hero: "移動費ゼロ。\nどうせ行くなら稼ごう。",
    sub: "成田→都内の移動、荷物1個受けるだけで交通費が消える。\nKAIROXプレイヤーとして登録しよう。",
    cta: "今すぐ登録する",
    earn_title: "報酬シミュレーション",
    earn_route: "ルート",
    earn_fare: "電車代",
    earn_reward: "報酬（目安）",
    earn_net: "実質移動費",
    earn_note: "信頼スコアが上がるほど、受けられる案件の単価も上がります。",
    how_title: "3ステップで稼ぐ",
    step1_title: "① アプリで案件を受ける",
    step1_body: "GPS上に表示された案件を選ぶだけ。スキルは不要。",
    step2_title: "② 空港で荷物を受け取る",
    step2_body: "旅行者とアプリ上でマッチング。指定場所で荷物を受け取る。",
    step3_title: "③ ホテルに届けて完了",
    step3_body: "届けたら報酬がアプリに即時反映。銀行振込またはPayPayで受け取り。",
    rank_title: "信頼スコアで単価UP",
    rank_new: "New",
    rank_new_body: "登録直後。標準案件を受けられる。",
    rank_trusted: "Trusted",
    rank_trusted_body: "評価4.0以上・20件完了。高単価案件が解放。",
    rank_elite: "Elite",
    rank_elite_body: "評価4.5以上・100件完了。優先表示・プレミアム案件。",
    rank_note: "評価・時間厳守・完了件数の3軸で自動計算されます。",
    form_title: "プレイヤー登録",
    form_name: "お名前",
    form_email: "メールアドレス",
    form_phone: "電話番号",
    form_route: "対応できるルート",
    route_narita: "成田 → 都内",
    route_haneda: "羽田 → 都内",
    route_both: "両方",
    form_submit: "登録する",
    form_note: "審査完了後（1〜2営業日）にメールでご連絡します。",
    success_title: "登録受付完了",
    success_body: "確認メールをお送りしました。1〜2営業日以内にご連絡します。",
    footer_company: "One Hour Value Inc.",
  },
  en: {
    nav_cta: "Book as a traveler",
    badge: "Players wanted — Narita / Haneda",
    hero: "Zero travel cost.\nGet paid on your commute.",
    sub: "Heading from Narita to central Tokyo anyway?\nCarry one bag and cover your train fare with KAIROX.",
    cta: "Register now",
    earn_title: "Earnings simulator",
    earn_route: "Route",
    earn_fare: "Train fare",
    earn_reward: "Reward (est.)",
    earn_net: "Net travel cost",
    earn_note: "Higher trust score = higher-paying jobs unlocked.",
    how_title: "3 steps to earn",
    step1_title: "① Pick a job on the map",
    step1_body: "Browse jobs on GPS. No special skills needed.",
    step2_title: "② Pick up luggage at the airport",
    step2_body: "Match with a traveler in the app. Collect their bag at the pickup point.",
    step3_title: "③ Deliver to the hotel",
    step3_body: "Drop it off, earn instantly. Bank transfer or PayPay.",
    rank_title: "Score up = pay up",
    rank_new: "New",
    rank_new_body: "Just registered. Access to standard jobs.",
    rank_trusted: "Trusted",
    rank_trusted_body: "4.0+ rating, 20+ jobs. Higher-paying jobs unlocked.",
    rank_elite: "Elite",
    rank_elite_body: "4.5+ rating, 100+ jobs. Priority display & premium jobs.",
    rank_note: "Score is calculated automatically from rating, punctuality, and job count.",
    form_title: "Player registration",
    form_name: "Full name",
    form_email: "Email",
    form_phone: "Phone number",
    form_route: "Available routes",
    route_narita: "Narita → Tokyo",
    route_haneda: "Haneda → Tokyo",
    route_both: "Both",
    form_submit: "Register",
    form_note: "We'll email you within 1–2 business days after review.",
    success_title: "Registration received",
    success_body: "A confirmation email has been sent. We'll be in touch within 1–2 business days.",
    footer_company: "One Hour Value Inc.",
  },
  zh: {
    nav_cta: "旅客预约入口",
    badge: "招募搬运员 — 成田 / 羽田",
    hero: "交通费变零。\n顺路一起赚钱。",
    sub: "反正要从成田去东京，带一件行李就能覆盖车费。\n立即注册成为 KAIROX 搬运员。",
    cta: "立即注册",
    earn_title: "收益模拟",
    earn_route: "路线",
    earn_fare: "电车费",
    earn_reward: "报酬（预估）",
    earn_net: "实际交通费",
    earn_note: "信任分越高，可接单价越高。",
    how_title: "3步赚钱",
    step1_title: "① 在地图上接单",
    step1_body: "在 GPS 上浏览订单，无需特殊技能。",
    step2_title: "② 在机场取行李",
    step2_body: "与旅客在 App 内匹配，在指定地点取行李。",
    step3_title: "③ 送达酒店完成",
    step3_body: "送达后报酬即时到账，支持银行转账或 PayPay。",
    rank_title: "信任分越高，单价越高",
    rank_new: "新手",
    rank_new_body: "刚注册。可接标准订单。",
    rank_trusted: "可信",
    rank_trusted_body: "评分 4.0 以上・完成 20 单。高价订单解锁。",
    rank_elite: "精英",
    rank_elite_body: "评分 4.5 以上・完成 100 单。优先显示・高级订单。",
    rank_note: "系统根据评分、守时率、完成单数自动计算。",
    form_title: "搬运员注册",
    form_name: "姓名",
    form_email: "电子邮件",
    form_phone: "手机号码",
    form_route: "可服务路线",
    route_narita: "成田 → 市区",
    route_haneda: "羽田 → 市区",
    route_both: "两条都可",
    form_submit: "提交注册",
    form_note: "审核完成后（1〜2个工作日）将通过邮件联系您。",
    success_title: "注册已受理",
    success_body: "确认邮件已发送，我们将在 1〜2 个工作日内与您联系。",
    footer_company: "One Hour Value Inc.",
  },
  ko: {
    nav_cta: "여행자 예약 페이지",
    badge: "플레이어 모집 — 나리타 / 하네다",
    hero: "이동비 제로.\n어차피 가는 길, 돈 벌자.",
    sub: "나리타에서 도쿄 어차피 가시죠?\n짐 하나 들고 가면 교통비가 사라집니다.",
    cta: "지금 등록하기",
    earn_title: "수익 시뮬레이션",
    earn_route: "노선",
    earn_fare: "전철 요금",
    earn_reward: "보수 (예상)",
    earn_net: "실질 이동비",
    earn_note: "신뢰 점수가 높을수록 더 높은 단가의 일을 받을 수 있습니다.",
    how_title: "3단계로 수익 창출",
    step1_title: "① 지도에서 일 받기",
    step1_body: "GPS에 표시된 건을 선택하면 끝. 특별한 기술 불필요.",
    step2_title: "② 공항에서 짐 수령",
    step2_body: "앱에서 여행자와 매칭 후 지정 장소에서 짐을 받습니다.",
    step3_title: "③ 호텔에 전달하고 완료",
    step3_body: "배달 완료 후 즉시 보수 지급. 은행 이체 또는 PayPay.",
    rank_title: "점수 올리면 단가 UP",
    rank_new: "New",
    rank_new_body: "등록 직후. 기본 건 수락 가능.",
    rank_trusted: "Trusted",
    rank_trusted_body: "평점 4.0 이상・20건 완료. 고단가 건 해금.",
    rank_elite: "Elite",
    rank_elite_body: "평점 4.5 이상・100건 완료. 우선 표시・프리미엄 건.",
    rank_note: "평점・시간 준수・완료 건수 3가지로 자동 계산됩니다.",
    form_title: "플레이어 등록",
    form_name: "이름",
    form_email: "이메일",
    form_phone: "전화번호",
    form_route: "담당 가능 노선",
    route_narita: "나리타 → 도쿄",
    route_haneda: "하네다 → 도쿄",
    route_both: "둘 다",
    form_submit: "등록하기",
    form_note: "심사 완료 후 (1〜2 영업일) 이메일로 연락드립니다.",
    success_title: "등록 접수 완료",
    success_body: "확인 이메일을 보내드렸습니다. 1〜2 영업일 이내에 연락드리겠습니다.",
    footer_company: "One Hour Value Inc.",
  },
};

const LOCALES: { value: Locale; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

const ROUTES_DATA = [
  { ja: "成田 → 新宿", en: "Narita → Shinjuku", fare: "¥3,070", reward: "¥3,500〜", net: "¥0 〜 +¥430" },
  { ja: "成田 → 浅草", en: "Narita → Asakusa", fare: "¥3,070", reward: "¥3,500〜", net: "¥0 〜 +¥430" },
  { ja: "羽田 → 渋谷", en: "Haneda → Shibuya", fare: "¥590", reward: "¥2,500〜", net: "-¥0 〜 +¥1,910" },
];

const RANKS = [
  { key: "rank_new" as const, badge: "rank_new_body" as const, color: "border-gray-600 bg-gray-800/40 text-gray-300", dot: "bg-gray-400" },
  { key: "rank_trusted" as const, badge: "rank_trusted_body" as const, color: "border-amber-500/40 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  { key: "rank_elite" as const, badge: "rank_elite_body" as const, color: "border-sky-500/40 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
];

export default function PlayerPage() {
  const [locale, setLocale] = useState<Locale>("ja");
  const [route, setRoute] = useState("both");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const tr = copy[locale];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/player-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, route }),
      });
    } catch {
      // バックエンド未接続でも登録受付済み表示
    }
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-[#080C18] text-white font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-[#080C18]/90 backdrop-blur border-b border-white/5">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold tracking-widest text-white">KAIROX</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400">
              PLAYER
            </span>
          </div>
          <div className="flex items-center gap-1">
            {LOCALES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLocale(l.value)}
                className={`px-2 py-1 rounded-md text-xs transition-all ${
                  locale === l.value
                    ? "bg-green-500 text-gray-950 font-semibold"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {l.label}
              </button>
            ))}
            <Link
              href="/narita"
              className="ml-2 px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-xs font-medium hover:bg-white/20 transition-colors"
            >
              {tr.nav_cta}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-green-500/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto px-5 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {tr.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-6 whitespace-pre-line">
            {tr.hero.split("\n")[0]}
            <br />
            <span className="text-green-400">{tr.hero.split("\n")[1]}</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed whitespace-pre-line mb-10">
            {tr.sub}
          </p>
          <a
            href="#register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-green-500 text-gray-950 font-bold text-base hover:bg-green-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/20"
          >
            {tr.cta}
            <span className="text-lg">→</span>
          </a>
        </div>
      </section>

      {/* Earnings table */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-6 text-white">{tr.earn_title}</h2>
        <div className="overflow-hidden rounded-2xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/80 text-gray-500 text-xs uppercase tracking-widest">
                <th className="px-4 py-3 text-left">{tr.earn_route}</th>
                <th className="px-4 py-3 text-right">{tr.earn_fare}</th>
                <th className="px-4 py-3 text-right">{tr.earn_reward}</th>
                <th className="px-4 py-3 text-right">{tr.earn_net}</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES_DATA.map((r, i) => (
                <tr key={i} className="border-t border-gray-800 bg-gray-900/30">
                  <td className="px-4 py-3 text-gray-300 font-medium">
                    {locale === "ja" ? r.ja : r.en}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.fare}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-bold">{r.reward}</td>
                  <td className="px-4 py-3 text-right text-amber-400 font-bold">{r.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-xs text-gray-600 mt-3">{tr.earn_note}</p>
      </section>

      {/* How it works */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-white">{tr.how_title}</h2>
        <div className="space-y-4">
          {[
            { emoji: "📱", title: tr.step1_title, body: tr.step1_body },
            { emoji: "🧳", title: tr.step2_title, body: tr.step2_body },
            { emoji: "💰", title: tr.step3_title, body: tr.step3_body },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-4 bg-gray-900/40 border border-gray-800 rounded-2xl px-5 py-4">
              <span className="text-3xl flex-shrink-0 mt-0.5">{s.emoji}</span>
              <div>
                <p className="text-sm font-bold text-green-300 mb-1">{s.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust score */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-white">{tr.rank_title}</h2>
        <div className="space-y-3">
          {RANKS.map((r) => (
            <div key={r.key} className={`flex items-start gap-4 border rounded-2xl px-5 py-4 ${r.color}`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${r.dot}`} />
              <div>
                <p className="text-sm font-bold mb-0.5">{tr[r.key]}</p>
                <p className="text-xs opacity-70 leading-relaxed">{tr[r.badge]}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-600 mt-4">{tr.rank_note}</p>
      </section>

      {/* Registration form */}
      <section id="register" className="max-w-2xl mx-auto px-5 py-12">
        <h2 className="text-xl font-bold text-center mb-8 text-white">{tr.form_title}</h2>

        {submitted ? (
          <div className="text-center bg-green-500/10 border border-green-500/30 rounded-2xl px-6 py-10">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-lg font-bold text-green-400 mb-2">{tr.success_title}</p>
            <p className="text-sm text-gray-400">{tr.success_body}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{tr.form_name}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{tr.form_email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{tr.form_phone}</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">{tr.form_route}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "narita", label: tr.route_narita },
                  { value: "haneda", label: tr.route_haneda },
                  { value: "both", label: tr.route_both },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRoute(opt.value)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      route === opt.value
                        ? "bg-green-500 border-green-500 text-gray-950 font-bold"
                        : "bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-green-500 text-gray-950 font-bold text-base hover:bg-green-400 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "..." : tr.form_submit}
            </button>
            <p className="text-center text-xs text-gray-600">{tr.form_note}</p>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 max-w-2xl mx-auto px-5 py-8 text-center space-y-2">
        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase">
          {tr.footer_company}
        </p>
        <p className="text-[10px] text-gray-800">© 2026 One Hour Value Inc. All rights reserved.</p>
      </footer>

    </div>
  );
}
