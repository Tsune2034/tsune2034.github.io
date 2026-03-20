"use client";

import { useState } from "react";
import type { Translation } from "./i18n";

// ───────────────────────── ターゲット企業 ─────────────────────────
const SEMICONDUCTOR_COMPANIES = [
  { name: "ASML",              country: "🇳🇱", role: "EUV Lithography"       },
  { name: "Applied Materials", country: "🇺🇸", role: "Deposition / Etch"     },
  { name: "Lam Research",      country: "🇺🇸", role: "Etch / Deposition"     },
  { name: "KLA Corporation",   country: "🇺🇸", role: "Inspection / Metrology"},
  { name: "Tokyo Electron",    country: "🇯🇵", role: "Process Equipment"     },
  { name: "Advantest",         country: "🇯🇵", role: "Test Equipment"        },
  { name: "Screen Holdings",   country: "🇯🇵", role: "Cleaning / Coating"    },
  { name: "IBM",               country: "🇺🇸", role: "Technology Partner"    },
  { name: "Imec",              country: "🇧🇪", role: "R&D Partner"           },
  { name: "Shin-Etsu Chemical",country: "🇯🇵", role: "Silicon Wafer"         },
  { name: "SUMCO",             country: "🇯🇵", role: "Silicon Wafer"         },
  { name: "Canon",             country: "🇯🇵", role: "Lithography"           },
];

const PLANS = [
  {
    key: "starter",
    nameKey: "biz_plan_starter" as const,
    price: "¥50,000",
    unit: "/月",
    deliveries: 10,
    color: "border-gray-700",
    badge: null,
  },
  {
    key: "business",
    nameKey: "biz_plan_business" as const,
    price: "¥120,000",
    unit: "/月",
    deliveries: 30,
    color: "border-amber-500",
    badge: "人気",
  },
  {
    key: "enterprise",
    nameKey: "biz_plan_enterprise" as const,
    price: "要相談",
    unit: "",
    deliveries: 999,
    color: "border-gray-700",
    badge: null,
  },
];

const FEATURES = [
  { icon: "✈️", key: "biz_feat_1" as const },
  { icon: "🔄", key: "biz_feat_2" as const },
  { icon: "🌐", key: "biz_feat_3" as const },
  { icon: "📊", key: "biz_feat_4" as const },
  { icon: "🤝", key: "biz_feat_5" as const },
  { icon: "⚡", key: "biz_feat_6" as const },
];

// ───────────────────────── Inquiry Form ─────────────────────────
function InquiryForm({ tr }: { tr: Translation }) {
  const [form, setForm] = useState({
    company: "", name: "", email: "", phone: "",
    employees: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Phase 1: バックエンドAPI接続
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="text-5xl">✅</div>
        <h3 className="text-lg font-bold text-white">{tr.biz_thanks_title}</h3>
        <p className="text-sm text-gray-400">{tr.biz_thanks_desc}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">{tr.biz_company} <span className="text-amber-500">*</span></label>
          <input
            required
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Rapidus株式会社"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">{tr.biz_name} <span className="text-amber-500">*</span></label>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="山田 太郎"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">{tr.biz_email} <span className="text-amber-500">*</span></label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="taro@company.com"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">{tr.biz_phone}</label>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+81 90-0000-0000"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-400">{tr.biz_monthly_deliveries}</label>
          <select
            value={form.employees}
            onChange={(e) => set("employees", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">---</option>
            <option value="1-5">1〜5件/月</option>
            <option value="6-20">6〜20件/月</option>
            <option value="21-50">21〜50件/月</option>
            <option value="50+">50件以上/月</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">{tr.biz_message}</label>
        <textarea
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder={tr.biz_message_placeholder}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 rounded-xl bg-amber-500 text-gray-950 font-semibold text-sm hover:bg-amber-400 transition-colors"
      >
        {tr.biz_submit}
      </button>
    </form>
  );
}

// ───────────────────────── Main ─────────────────────────
export default function BusinessView({ tr }: { tr: Translation }) {
  return (
    <div className="space-y-8">

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400">
            BUSINESS
          </span>
          <span className="text-xs text-gray-500">Rapidus / 半導体 / IT 企業向け</span>
        </div>
        <h2 className="text-xl font-bold text-white leading-snug">
          {tr.biz_hero_title}
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          {tr.biz_hero_desc}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {["Rapidus", "ASML", "IBM", "Applied Materials", "TEL"].map((c) => (
            <span key={c} className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
              {c}
            </span>
          ))}
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-500">
            +{SEMICONDUCTOR_COMPANIES.length - 5} more
          </span>
        </div>
      </div>

      {/* Features */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          {tr.biz_features_title}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map(({ icon, key }) => (
            <div key={key} className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-xl p-3">
              <span className="text-lg flex-shrink-0">{icon}</span>
              <p className="text-xs text-gray-300 leading-snug">{tr[key]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Partner companies */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          {tr.biz_targets_title}
        </h3>
        <div className="space-y-1.5">
          {SEMICONDUCTOR_COMPANIES.map((c) => (
            <div key={c.name} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{c.country}</span>
                <span className="text-sm font-semibold text-gray-200">{c.name}</span>
              </div>
              <span className="text-xs text-gray-500">{c.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          {tr.biz_plans_title}
        </h3>
        <div className="space-y-3">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`relative bg-gray-900 border rounded-2xl p-4 ${p.color} ${p.badge ? "border-amber-500" : ""}`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 left-4 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-gray-950 font-bold">
                  {p.badge}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{tr[p.nameKey]}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.deliveries === 999 ? tr.biz_unlimited : `${p.deliveries}${tr.biz_deliveries_per_month}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-amber-400">{p.price}</span>
                  <span className="text-xs text-gray-500">{p.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">{tr.biz_plans_note}</p>
      </div>

      {/* Inquiry */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">{tr.biz_inquiry_title}</h3>
        <InquiryForm tr={tr} />
      </div>

    </div>
  );
}
