"use client";

import { useState, useEffect } from "react";

type RepairEntry = {
  id: string;
  date: string;
  time: string;
  equipment: string;
  faultMode: string;   // 故障モード
  faultEffect: string; // 故障の影響
  action: string;
  technician: string;
  status: "completed" | "pending";
  // FMEA
  severity: number;    // S: 重篤度 1-10
  occurrence: number;  // O: 発生頻度 1-10
  detection: number;   // D: 検出難易度 1-10
};

const EQUIPMENT_LIST = [
  "Belt Conveyor #1", "Belt Conveyor #2", "Belt Conveyor #3",
  "Tray Sorter", "Check-in Conveyor", "Self Check-in Kiosk",
  "ATR Scanner", "PLC Panel A", "PLC Panel B",
  "Inverter Unit", "Emergency Stop Circuit", "Other",
];

const RPN_LEVELS = [
  { min: 200, label: "Critical",  color: "bg-red-100 text-red-800 border-red-300" },
  { min: 100, label: "High",      color: "bg-orange-100 text-orange-800 border-orange-300" },
  { min: 50,  label: "Medium",    color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { min: 0,   label: "Low",       color: "bg-green-100 text-green-800 border-green-300" },
];

function getRPNLevel(rpn: number) {
  return RPN_LEVELS.find(l => rpn >= l.min) ?? RPN_LEVELS[3];
}

const FMEA_GUIDE = {
  severity: ["1 軽微な影響なし", "2-3 わずかな不便", "4-5 運用に影響", "6-7 部分停止", "8-9 全停止・安全影響", "10 人身事故リスク"],
  occurrence: ["1 ほぼ発生しない", "2-3 年1回程度", "4-5 月1回程度", "6-7 週1回程度", "8-9 毎日発生", "10 常時発生"],
  detection: ["1 自動検知・即対応", "2-3 容易に検知", "4-5 通常点検で検知", "6-7 熟練者が気づく", "8-9 発見困難", "10 検知不可"],
};

function newEntry(): RepairEntry {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    equipment: EQUIPMENT_LIST[0],
    faultMode: "",
    faultEffect: "",
    action: "",
    technician: "",
    status: "completed",
    severity: 5,
    occurrence: 3,
    detection: 3,
  };
}

function RatingSlider({ label, sublabel, value, onChange }: {
  label: string; sublabel: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="text-xs text-gray-500">{label} <span className="text-gray-400">({sublabel})</span></label>
        <span className="text-sm font-bold text-gray-700">{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#003087]" />
      <p className="text-[10px] text-gray-400 mt-0.5">{FMEA_GUIDE[sublabel as keyof typeof FMEA_GUIDE]?.[Math.floor((value - 1) / 2)] ?? ""}</p>
    </div>
  );
}

export default function RepairHistory() {
  const [entries, setEntries] = useState<RepairEntry[]>([]);
  const [form, setForm] = useState<RepairEntry>(newEntry());
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sortByRPN, setSortByRPN] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("datj_repair_history");
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  function save(updated: RepairEntry[]) {
    setEntries(updated);
    localStorage.setItem("datj_repair_history", JSON.stringify(updated));
  }

  function addEntry() {
    if (!form.faultMode.trim() || !form.action.trim()) return;
    save([form, ...entries]);
    setForm(newEntry());
    setShowForm(false);
  }

  function deleteEntry(id: string) { save(entries.filter(e => e.id !== id)); }

  function copyEntry(e: RepairEntry) {
    const rpn = e.severity * e.occurrence * e.detection;
    const text = [
      `【FMEA Repair Record】${e.date} ${e.time}`,
      `Equipment: ${e.equipment}`,
      `Failure Mode: ${e.faultMode}`,
      `Effect: ${e.faultEffect}`,
      `Action Taken: ${e.action}`,
      `Technician: ${e.technician}`,
      `RPN: ${rpn} (S${e.severity} × O${e.occurrence} × D${e.detection})`,
      `Status: ${e.status}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  }

  const filtered = entries
    .filter(e => [e.equipment, e.faultMode, e.faultEffect, e.action, e.technician]
      .some(f => f.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => sortByRPN
      ? (b.severity * b.occurrence * b.detection) - (a.severity * a.occurrence * a.detection)
      : 0);

  const highRPN = entries.filter(e => e.severity * e.occurrence * e.detection >= 100).length;

  return (
    <div className="space-y-4">
      {/* RPN summary */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {RPN_LEVELS.map(level => {
            const count = entries.filter(e => {
              const rpn = e.severity * e.occurrence * e.detection;
              const next = RPN_LEVELS[RPN_LEVELS.indexOf(level) - 1];
              return rpn >= level.min && (!next || rpn < next.min);
            }).length;
            return (
              <div key={level.label} className={`rounded-xl border p-3 text-center ${level.color}`}>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs font-medium">{level.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {highRPN > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>RPN 100以上 {highRPN}件</strong> — 優先対応が必要です</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="設備・故障モードで検索..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none" />
        <button onClick={() => setSortByRPN(v => !v)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            sortByRPN ? "bg-[#003087] text-white border-[#003087]" : "border-gray-200 text-gray-500"
          }`}>RPN順</button>
        <button onClick={() => { setForm(newEntry()); setShowForm(true); }}
          className="px-4 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e] whitespace-nowrap">
          + New Record
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">FMEA Repair Record</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Time</label>
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Equipment</label>
              <select value={form.equipment} onChange={e => setForm({...form, equipment: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 bg-white">
                {EQUIPMENT_LIST.map(eq => <option key={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Technician</label>
              <input value={form.technician} onChange={e => setForm({...form, technician: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Failure Mode（故障モード）</label>
            <input value={form.faultMode} onChange={e => setForm({...form, faultMode: e.target.value})}
              placeholder="例: Belt jam at merge point"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Effect（影響）</label>
            <input value={form.faultEffect} onChange={e => setForm({...form, faultEffect: e.target.value})}
              placeholder="例: BHS line stoppage, 15min delay"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Action Taken（対応内容）</label>
            <textarea value={form.action} onChange={e => setForm({...form, action: e.target.value})}
              rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 resize-none" />
          </div>

          {/* FMEA Ratings */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-gray-600">FMEA Rating</p>
              <div className={`px-3 py-1 rounded-full border text-sm font-bold ${getRPNLevel(form.severity * form.occurrence * form.detection).color}`}>
                RPN: {form.severity * form.occurrence * form.detection}
                <span className="text-xs font-normal ml-1">({getRPNLevel(form.severity * form.occurrence * form.detection).label})</span>
              </div>
            </div>
            <RatingSlider label="S — Severity" sublabel="severity" value={form.severity} onChange={v => setForm({...form, severity: v})} />
            <RatingSlider label="O — Occurrence" sublabel="occurrence" value={form.occurrence} onChange={v => setForm({...form, occurrence: v})} />
            <RatingSlider label="D — Detection" sublabel="detection" value={form.detection} onChange={v => setForm({...form, detection: v})} />
          </div>

          <div>
            <label className="text-xs text-gray-500">Status</label>
            <div className="flex gap-2 mt-1">
              {(["completed", "pending"] as const).map(s => (
                <button key={s} onClick={() => setForm({...form, status: s})}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    form.status === s ? "bg-[#003087] text-white border-[#003087]" : "border-gray-200 text-gray-600"
                  }`}>
                  {s === "completed" ? "✅ Completed" : "⏳ Pending"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addEntry}
              className="flex-1 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e]">Save</button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          {search ? "No matching records" : "No repair records. Click \"+ New Record\" to add."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => {
            const rpn = entry.severity * entry.occurrence * entry.detection;
            const level = getRPNLevel(rpn);
            return (
              <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${level.color}`}>
                      RPN {rpn} — {level.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      entry.status === "completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {entry.status === "completed" ? "Completed" : "Pending"}
                    </span>
                    <span className="text-xs text-gray-400">{entry.date} {entry.time}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copyEntry(entry)} className="text-xs text-gray-400 hover:text-gray-600">Copy</button>
                    <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-300 hover:text-red-500">Delete</button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700 mt-2">{entry.equipment}</p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="text-xs text-gray-400">Failure Mode: </span>{entry.faultMode}
                </p>
                {entry.faultEffect && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="text-xs text-gray-400">Effect: </span>{entry.faultEffect}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="text-xs text-gray-400">Action: </span>{entry.action}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">S{entry.severity} × O{entry.occurrence} × D{entry.detection} = <strong>{rpn}</strong></span>
                  {entry.technician && <span className="text-xs text-gray-400">by {entry.technician}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
