"use client";

import { useState } from "react";
import ShiftSchedule from "./components/ShiftSchedule";
import RepairHistory from "./components/RepairHistory";
import Translator from "./components/Translator";

const TABS = [
  { id: "shift",   label: "シフト表",   icon: "📅" },
  { id: "repair",  label: "修理履歴",   icon: "🔧" },
  { id: "translate", label: "BHS翻訳", icon: "🌐" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>("shift");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#003087] flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">KAIROX ワークツール</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</span>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#003087] text-[#003087]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "shift"     && <ShiftSchedule />}
        {activeTab === "repair"    && <RepairHistory />}
        {activeTab === "translate" && <Translator />}
      </main>
    </div>
  );
}
