"use client";

import { useState, useEffect } from "react";

type RepairEntry = {
  id: string;
  date: string;
  time: string;
  equipment: string;
  fault: string;
  action: string;
  technician: string;
  status: "completed" | "pending";
};

const EQUIPMENT_LIST = [
  "Belt Conveyor #1", "Belt Conveyor #2", "Belt Conveyor #3",
  "Tray Sorter", "Check-in Conveyor", "Self Check-in Kiosk",
  "ATR Scanner", "PLC Panel A", "PLC Panel B",
  "Inverter Unit", "Emergency Stop Circuit", "その他",
];

function newEntry(): RepairEntry {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    equipment: EQUIPMENT_LIST[0],
    fault: "",
    action: "",
    technician: "",
    status: "completed",
  };
}

export default function RepairHistory() {
  const [entries, setEntries] = useState<RepairEntry[]>([]);
  const [form, setForm] = useState<RepairEntry>(newEntry());
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("datj_repair_history");
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  function save(updated: RepairEntry[]) {
    setEntries(updated);
    localStorage.setItem("datj_repair_history", JSON.stringify(updated));
  }

  function addEntry() {
    if (!form.fault.trim() || !form.action.trim()) return;
    save([form, ...entries]);
    setForm(newEntry());
    setShowForm(false);
  }

  function deleteEntry(id: string) {
    save(entries.filter(e => e.id !== id));
  }

  function copyEntry(e: RepairEntry) {
    const text = `【修理履歴】${e.date} ${e.time}\n設備: ${e.equipment}\n障害: ${e.fault}\n対応: ${e.action}\n担当: ${e.technician}`;
    navigator.clipboard.writeText(text);
  }

  const filtered = entries.filter(e =>
    [e.equipment, e.fault, e.action, e.technician].some(f =>
      f.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="設備名・内容で検索..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none"
        />
        <button
          onClick={() => { setForm(newEntry()); setShowForm(true); }}
          className="px-4 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e] transition-colors whitespace-nowrap"
        >
          + 新規記録
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">修理・対応記録</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">日付</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">時刻</label>
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">設備名</label>
              <select value={form.equipment} onChange={e => setForm({...form, equipment: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 bg-white">
                {EQUIPMENT_LIST.map(eq => <option key={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">担当者</label>
              <input value={form.technician} onChange={e => setForm({...form, technician: e.target.value})}
                placeholder="名前"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">障害内容</label>
            <textarea value={form.fault} onChange={e => setForm({...form, fault: e.target.value})}
              rows={2} placeholder="発生した障害・アラーム内容"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500">対応内容</label>
            <textarea value={form.action} onChange={e => setForm({...form, action: e.target.value})}
              rows={2} placeholder="実施した対応・修理内容"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500">ステータス</label>
            <div className="flex gap-2 mt-1">
              {(["completed", "pending"] as const).map(s => (
                <button key={s} onClick={() => setForm({...form, status: s})}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    form.status === s ? "bg-[#003087] text-white border-[#003087]" : "border-gray-200 text-gray-600"
                  }`}>
                  {s === "completed" ? "✅ 完了" : "⏳ 対応中"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addEntry}
              className="flex-1 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e]">
              保存
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          {search ? "該当する記録がありません" : "修理履歴がありません。「+ 新規記録」から追加してください。"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    entry.status === "completed"
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}>
                    {entry.status === "completed" ? "完了" : "対応中"}
                  </span>
                  <span className="text-xs text-gray-400">{entry.date} {entry.time}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyEntry(entry)} className="text-xs text-gray-400 hover:text-gray-600">コピー</button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-300 hover:text-red-500">削除</button>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700 mt-2">{entry.equipment}</p>
              <p className="text-sm text-gray-600 mt-1"><span className="text-xs text-gray-400">障害：</span>{entry.fault}</p>
              <p className="text-sm text-gray-600 mt-0.5"><span className="text-xs text-gray-400">対応：</span>{entry.action}</p>
              {entry.technician && (
                <p className="text-xs text-gray-400 mt-1">担当: {entry.technician}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
