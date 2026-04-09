"use client";

import { useState } from "react";
import Link from "next/link";

type Locale = "en" | "ja" | "zh" | "ko";

const TR = {
  en: {
    title: "Contact Us",
    sub: "We usually reply within 24 hours.",
    name: "Name", name_ph: "Your name",
    email: "Email", email_ph: "your@email.com",
    category: "Category",
    cats: [
      { value: "booking", label: "Booking & Pricing" },
      { value: "driver", label: "Become a Driver" },
      { value: "b2b", label: "Hotel / Business Partnership" },
      { value: "other", label: "Other" },
    ],
    message: "Message", message_ph: "Tell us how we can help…",
    send: "Send Message",
    sending: "Sending…",
    success: "Message sent! We'll get back to you soon.",
    error: "Something went wrong. Please try again.",
    back: "← Back to booking",
  },
  ja: {
    title: "お問い合わせ",
    sub: "通常24時間以内にご返信します。",
    name: "お名前", name_ph: "お名前",
    email: "メールアドレス", email_ph: "your@email.com",
    category: "お問い合わせ種別",
    cats: [
      { value: "booking", label: "予約・料金について" },
      { value: "driver", label: "ドライバー応募" },
      { value: "b2b", label: "法人・ホテル提携" },
      { value: "other", label: "その他" },
    ],
    message: "メッセージ", message_ph: "お気軽にご相談ください…",
    send: "送信する",
    sending: "送信中…",
    success: "送信しました。近日中にご連絡します。",
    error: "送信に失敗しました。もう一度お試しください。",
    back: "← 予約画面に戻る",
  },
  zh: {
    title: "联系我们",
    sub: "我们通常在24小时内回复。",
    name: "姓名", name_ph: "您的姓名",
    email: "电子邮件", email_ph: "your@email.com",
    category: "咨询类别",
    cats: [
      { value: "booking", label: "预订与价格" },
      { value: "driver", label: "成为司机" },
      { value: "b2b", label: "酒店/企业合作" },
      { value: "other", label: "其他" },
    ],
    message: "留言", message_ph: "请告诉我们您的需求…",
    send: "发送消息",
    sending: "发送中…",
    success: "消息已发送！我们会尽快联系您。",
    error: "发送失败，请重试。",
    back: "← 返回预订页面",
  },
  ko: {
    title: "문의하기",
    sub: "보통 24시간 이내에 답변드립니다.",
    name: "이름", name_ph: "이름을 입력하세요",
    email: "이메일", email_ph: "your@email.com",
    category: "문의 유형",
    cats: [
      { value: "booking", label: "예약 및 요금" },
      { value: "driver", label: "드라이버 지원" },
      { value: "b2b", label: "호텔/기업 제휴" },
      { value: "other", label: "기타" },
    ],
    message: "메시지", message_ph: "무엇이든 편하게 물어보세요…",
    send: "메시지 보내기",
    sending: "전송 중…",
    success: "전송 완료! 곧 연락드리겠습니다.",
    error: "전송 실패. 다시 시도해 주세요.",
    back: "← 예약 화면으로 돌아가기",
  },
} as const;

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "zh", label: "中" },
  { value: "ko", label: "한" },
];

export default function ContactPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const tr = TR[locale];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("booking");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, message, locale }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setName(""); setEmail(""); setMessage(""); setCategory("booking");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link href="/narita" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          {tr.back}
        </Link>
        <div className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLocale(l.value)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${locale === l.value ? "bg-[#0052ff] text-white" : "text-gray-400 hover:text-gray-200"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-2xl font-black tracking-tight text-white">KAIROX</span>
          </div>
          <h1 className="text-xl font-bold text-white">{tr.title}</h1>
          <p className="text-xs text-gray-400 mt-1">{tr.sub}</p>
        </div>

        {status === "success" ? (
          <div className="bg-green-900/40 border border-green-700 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-sm font-bold text-green-400">{tr.success}</p>
            <Link href="/narita" className="mt-4 inline-block text-xs text-blue-400 hover:text-blue-300">
              {tr.back}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">{tr.name}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr.name_ph}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0052ff] transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">{tr.email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tr.email_ph}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0052ff] transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">{tr.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0052ff] transition-colors"
              >
                {tr.cats.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">{tr.message}</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={tr.message_ph}
                rows={5}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0052ff] transition-colors resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-xs text-red-400 text-center">{tr.error}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full py-4 rounded-2xl bg-[#0052ff] text-white font-bold text-sm hover:bg-[#003fcc] transition-colors disabled:opacity-50"
            >
              {status === "sending" ? tr.sending : tr.send}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
