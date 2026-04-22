"use client";

import { useState } from "react";
import ShiftSchedule from "./components/ShiftSchedule";
import RepairHistory from "./components/RepairHistory";
import Translator from "./components/Translator";
import TaskBoard from "./components/TaskBoard";

export type Lang = "ja" | "en";

const TABS = [
  { id: "shift",     label: "Shift",     icon: "📅" },
  { id: "tasks",     label: "Tasks",     icon: "📋" },
  { id: "repair",    label: "FMEA Log",  icon: "🔧" },
  { id: "translate", label: "Translate", icon: "🌐" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>("shift");
  const [lang, setLang] = useState<Lang>("ja");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#003087] flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">KAIROX Work Tools</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button onClick={() => setLang("ja")}
                className={`px-3 py-1.5 transition-colors ${lang === "ja" ? "bg-[#003087] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                JA
              </button>
              <button onClick={() => setLang("en")}
                className={`px-3 py-1.5 transition-colors ${lang === "en" ? "bg-[#003087] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                EN
              </button>
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "short", day: "numeric", weekday: "short" })}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? "border-[#003087] text-[#003087]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <span className="mr-1.5">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "shift"     && <ShiftSchedule />}
        {activeTab === "tasks"     && <TaskBoard lang={lang} />}
        {activeTab === "repair"    && <RepairHistory lang={lang} />}
        {activeTab === "translate" && <Translator />}
      </main>
    </div>
  );
}
