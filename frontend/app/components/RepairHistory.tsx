"use client";

import { useState, useEffect } from "react";
import type { Lang } from "../page";

const T = {
  ja: {
    newRecord: "+ 新規記録", save: "保存", cancel: "キャンセル",
    title: "FMEA 修理記録",
    date: "日付", time: "時刻", equipment: "設備名", technician: "担当者",
    failureMode: "故障モード（Failure Mode）*",
    effect: "影響（Effect）",
    ca: "CA — 暫定対応（Containment Action）*",
    pa: "PA — 恒久対策（Permanent Action）",
    paTbd: "PA: 未定",
    fmeaRating: "FMEA レーティング",
    status: "ステータス",
    searchPlaceholder: "設備・故障モードで検索...",
    rpnSort: "RPN順",
    rpnAlert: "件 — 優先対応が必要です",
    noRecords: "修理履歴がありません。「+ 新規記録」から追加してください。",
    noMatch: "該当する記録がありません",
    copy: "コピー", delete: "削除",
    caPrefix: "CA: ", paPrefix: "PA: ",
  },
  en: {
    newRecord: "+ New Record", save: "Save", cancel: "Cancel",
    title: "FMEA Repair Record",
    date: "Date", time: "Time", equipment: "Equipment", technician: "Technician",
    failureMode: "Failure Mode *",
    effect: "Effect",
    ca: "CA — Containment Action *",
    pa: "PA — Permanent Action",
    paTbd: "PA: TBD",
    fmeaRating: "FMEA Rating",
    status: "Status",
    searchPlaceholder: "Search by equipment or failure mode...",
    rpnSort: "Sort by RPN",
    rpnAlert: " — Priority action required",
    noRecords: "No repair records. Click \"+ New Record\" to add.",
    noMatch: "No matching records",
    copy: "Copy", delete: "Delete",
    caPrefix: "CA: ", paPrefix: "PA: ",
  },
};

type RepairEntry = {
  id: string;
  date: string;
  time: string;
  equipment: string;
  faultMode: string;   // 故障モード
  faultEffect: string; // 故障の影響
  ca: string;          // Containment Action（暫定対応）
  pa: string;          // Permanent Action（恒久対策）
  technician: string;
  status: "completed" | "pending" | "pa_open";
  repairMinutes: number; // 修理時間（分）- MTTR計算用
  // FMEA
  severity: number;
  occurrence: number;
  detection: number;
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

// MTTR = 修理時間の平均（分）
function calcMTTR(entries: RepairEntry[]): number | null {
  const valid = entries.filter(e => e.repairMinutes > 0);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, e) => s + e.repairMinutes, 0) / valid.length);
}

// MTBF = 故障間隔の平均（時間）- 設備ごとに日時ソートして計算
function calcMTBF(entries: RepairEntry[], equipment?: string): number | null {
  const filtered = (equipment
    ? entries.filter(e => e.equipment === equipment)
    : entries
  ).filter(e => e.date && e.time);

  if (filtered.length < 2) return null;

  const sorted = [...filtered].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i-1].date}T${sorted[i-1].time}`);
    const curr = new Date(`${sorted[i].date}T${sorted[i].time}`);
    const hours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);
    if (hours > 0) gaps.push(hours);
  }
  if (gaps.length === 0) return null;
  return Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
}

const FMEA_GUIDE = {
  severity: ["1 軽微な影響なし", "2-3 わずかな不便", "4-5 運用に影響", "6-7 部分停止", "8-9 全停止・安全影響", "10 人身事故リスク"],
  occurrence: ["1 ほぼ発生しない", "2-3 年1回程度", "4-5 月1回程度", "6-7 週1回程度", "8-9 毎日発生", "10 常時発生"],
  detection: ["1 自動検知・即対応", "2-3 容易に検知", "4-5 通常点検で検知", "6-7 熟練者が気づく", "8-9 発見困難", "10 検知不可"],
};

const STATUS_LABELS: Record<"completed" | "pending" | "pa_open", { label: string; color: string }> = {
  completed: { label: "✅ Completed",  color: "bg-green-50 text-green-700 border-green-200" },
  pending:   { label: "⏳ CA Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  pa_open:   { label: "🔧 PA Open",    color: "bg-orange-50 text-orange-700 border-orange-200" },
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
    ca: "",
    pa: "",
    technician: "",
    status: "pending",
    repairMinutes: 0,
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

export default function RepairHistory({ lang = "ja" }: { lang?: Lang }) {
  const tr = T[lang];
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
    if (!form.faultMode.trim() || !form.ca.trim()) return;
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
      `CA (Containment Action): ${e.ca}`,
      `PA (Permanent Action): ${e.pa || "TBD"}`,
      `Technician: ${e.technician}`,
      `RPN: ${rpn} (S${e.severity} × O${e.occurrence} × D${e.detection})`,
      `Status: ${STATUS_LABELS[e.status].label}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
  }

  const filtered = entries
    .filter(e => [e.equipment, e.faultMode, e.faultEffect, e.ca, e.pa, e.technician]
      .some(f => (f || "").toLowerCase().includes(search.toLowerCase())))
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

      {/* MTTR / MTBF */}
      {entries.length >= 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Reliability Metrics</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">
                {calcMTTR(entries) !== null ? `${calcMTTR(entries)} min` : "—"}
              </p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">MTTR</p>
              <p className="text-[10px] text-gray-400">Mean Time To Repair</p>
              <p className="text-[10px] text-gray-400">修理時間の平均</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-700">
                {calcMTBF(entries) !== null ? `${calcMTBF(entries)} h` : "—"}
              </p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">MTBF</p>
              <p className="text-[10px] text-gray-400">Mean Time Between Failures</p>
              <p className="text-[10px] text-gray-400">故障間隔の平均</p>
            </div>
          </div>
          {entries.length < 2 && (
            <p className="text-[10px] text-gray-400 text-center mt-2">※ MTBF算出には2件以上の記録が必要</p>
          )}
        </div>
      )}

      {highRPN > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>RPN 100以上 {highRPN}件</strong>{tr.rpnAlert}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tr.searchPlaceholder}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none" />
        <button onClick={() => setSortByRPN(v => !v)}
          className={`px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            sortByRPN ? "bg-[#003087] text-white border-[#003087]" : "border-gray-200 text-gray-500"
          }`}>{tr.rpnSort}</button>
        <button onClick={() => { setForm(newEntry()); setShowForm(true); }}
          className="px-4 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e] whitespace-nowrap">
          {tr.newRecord}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-gray-700">{tr.title}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">{tr.date}</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">{tr.time}</label>
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">{tr.equipment}</label>
              <select value={form.equipment} onChange={e => setForm({...form, equipment: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 bg-white">
                {EQUIPMENT_LIST.map(eq => <option key={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{tr.technician}</label>
              <input value={form.technician} onChange={e => setForm({...form, technician: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">{tr.failureMode}</label>
            <input value={form.faultMode} onChange={e => setForm({...form, faultMode: e.target.value})}
              placeholder="例: Belt jam at merge point"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">{tr.effect}</label>
            <input value={form.faultEffect} onChange={e => setForm({...form, faultEffect: e.target.value})}
              placeholder="例: BHS line stoppage, 15min delay"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">修理時間（分）/ Repair Duration (min)</label>
            <input type="number" min={0} value={form.repairMinutes || ""}
              onChange={e => setForm({...form, repairMinutes: Number(e.target.value)})}
              placeholder="例: 45"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-blue-700">{tr.ca}</label>
            <textarea value={form.ca} onChange={e => setForm({...form, ca: e.target.value})}
              rows={2} placeholder="例: Removed foreign object, reset PLC, resumed operation"
              className="w-full text-sm border border-blue-200 rounded-lg px-3 py-1.5 mt-1 resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-orange-700">{tr.pa}</label>
            <textarea value={form.pa} onChange={e => setForm({...form, pa: e.target.value})}
              rows={2} placeholder="例: Replace worn guide rail, update PM schedule — 未定の場合は空欄可"
              className="w-full text-sm border border-orange-200 rounded-lg px-3 py-1.5 mt-1 resize-none" />
          </div>

          {/* FMEA Ratings */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-gray-600">{tr.fmeaRating}</p>
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
            <div className="flex gap-2 mt-1 flex-wrap">
              {(Object.entries(STATUS_LABELS) as [RepairEntry["status"], {label: string; color: string}][]).map(([s, cfg]) => (
                <button key={s} onClick={() => setForm({...form, status: s})}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    form.status === s ? "bg-[#003087] text-white border-[#003087]" : "border-gray-200 text-gray-600"
                  }`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addEntry}
              className="flex-1 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e]">{tr.save}</button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">{tr.cancel}</button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          {search ? tr.noMatch : tr.noRecords}
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
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_LABELS[entry.status].color}`}>
                      {STATUS_LABELS[entry.status].label}
                    </span>
                    <span className="text-xs text-gray-400">{entry.date} {entry.time}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copyEntry(entry)} className="text-xs text-gray-400 hover:text-gray-600">{tr.copy}</button>
                    <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-300 hover:text-red-500">{tr.delete}</button>
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
                  <span className="text-xs font-medium text-blue-600">CA: </span>{entry.ca}
                </p>
                {entry.pa ? (
                  <p className="text-sm text-gray-600 mt-0.5">
                    <span className="text-xs font-medium text-orange-600">PA: </span>{entry.pa}
                  </p>
                ) : (
                  <p className="text-xs text-orange-400 mt-0.5">{tr.paTbd}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs text-gray-400">S{entry.severity} × O{entry.occurrence} × D{entry.detection} = <strong>{rpn}</strong></span>
                  {entry.repairMinutes > 0 && (
                    <span className="text-xs text-blue-500">⏱ {entry.repairMinutes} min</span>
                  )}
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
