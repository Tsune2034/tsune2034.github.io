"use client";

import { useState, useEffect } from "react";

type ShiftType = "day1" | "day2" | "night1" | "night2" | "off" | "paid" | "comp" | "training";

const SHIFT_CONFIG: Record<ShiftType, { label: string; time: string; color: string; startH: number | null; endH: number | null }> = {
  day1:     { label: "日勤A",  time: "07-19",  color: "bg-blue-100 text-blue-800 border-blue-200",     startH: 7,  endH: 19 },
  day2:     { label: "日勤B",  time: "08-20",  color: "bg-sky-100 text-sky-800 border-sky-200",        startH: 8,  endH: 20 },
  night1:   { label: "夜勤A",  time: "19-翌07", color: "bg-indigo-100 text-indigo-800 border-indigo-200", startH: 19, endH: 31 }, // 31 = 翌7:00
  night2:   { label: "夜勤B",  time: "20-翌08", color: "bg-violet-100 text-violet-800 border-violet-200", startH: 20, endH: 32 }, // 32 = 翌8:00
  off:      { label: "休み",   time: "",        color: "bg-gray-50 text-gray-400 border-gray-100",      startH: null, endH: null },
  paid:     { label: "有休",   time: "",        color: "bg-green-100 text-green-700 border-green-200",  startH: null, endH: null },
  comp:     { label: "代休",   time: "",        color: "bg-teal-100 text-teal-700 border-teal-200",     startH: null, endH: null },
  training: { label: "研修",   time: "08-17",   color: "bg-amber-100 text-amber-800 border-amber-200",  startH: 8,  endH: 17 },
};

const SHIFT_CYCLE: ShiftType[] = ["day1", "day2", "night1", "night2", "off", "paid", "comp", "training"];
const REST_TYPES: ShiftType[] = ["off", "paid", "comp"];
const MIN_INTERVAL_H = 11; // 勤務間インターバル規制（2026年後半適用予定）
const MAX_CONSECUTIVE_DAYS = 13; // 14日以上連続禁止（2026年後半適用予定）

type Member = { id: string; name: string };
type ShiftData = Record<string, Record<string, ShiftType>>;

// 指定日のシフト開始・終了時刻（その日の0時からの時間数）
function shiftHours(shift: ShiftType): { startH: number | null; endH: number | null } {
  return { startH: SHIFT_CONFIG[shift].startH, endH: SHIFT_CONFIG[shift].endH };
}

// 2シフト間のインターバル時間数（日をまたぐ考慮あり）
// prevDate: YYYY-MM-DD, nextDate: YYYY-MM-DD
function calcInterval(prevShift: ShiftType, nextShift: ShiftType, prevDate: string, nextDate: string): number | null {
  const { endH: prevEnd } = shiftHours(prevShift);
  const { startH: nextStart } = shiftHours(nextShift);
  if (prevEnd === null || nextStart === null) return null;

  const prev = new Date(prevDate);
  const next = new Date(nextDate);
  const dayDiff = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

  // prevEndは前日基準の時間数（night1のendH=31なら翌7:00）
  // nextStartはnextDate基準の時間数
  const intervalH = dayDiff * 24 + nextStart - prevEnd;
  return intervalH;
}

// 連続勤務日数を計算（指定日時点）
function calcConsecutiveDays(memberId: string, targetDate: string, allShifts: ShiftData): number {
  let count = 0;
  const d = new Date(targetDate);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    const shift: ShiftType = allShifts[memberId]?.[key] ?? "off";
    if (REST_TYPES.includes(shift)) break;
    count++;
    d.setDate(d.getDate() - 1);
    if (count > 30) break; // 無限ループ防止
  }
  return count;
}

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(d: Date) { return d.toISOString().slice(0, 10); }

function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const DOW_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MON_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DEFAULT_MEMBERS: Member[] = [
  { id: "1", name: "常森" },
  { id: "2", name: "メンバーB" },
  { id: "3", name: "メンバーC" },
  { id: "4", name: "メンバーD" },
  { id: "5", name: "メンバーE" },
  { id: "6", name: "メンバーF" },
  { id: "7", name: "メンバーG" },
];

export default function ShiftSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS);
  const [shifts, setShifts] = useState<ShiftData>({});
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [newMemberName, setNewMemberName] = useState("");

  const days = getWeekDates(weekOffset);

  useEffect(() => {
    const m = localStorage.getItem("datj_shift_members");
    const s = localStorage.getItem("datj_shift_data");
    if (m) setMembers(JSON.parse(m));
    if (s) setShifts(JSON.parse(s));
  }, []);

  function saveShifts(updated: ShiftData) {
    setShifts(updated);
    localStorage.setItem("datj_shift_data", JSON.stringify(updated));
  }

  function saveMembers(updated: Member[]) {
    setMembers(updated);
    localStorage.setItem("datj_shift_members", JSON.stringify(updated));
  }

  function cycleShift(memberId: string, date: string) {
    const current: ShiftType = shifts[memberId]?.[date] ?? "off";
    const nextIdx = (SHIFT_CYCLE.indexOf(current) + 1) % SHIFT_CYCLE.length;
    saveShifts({ ...shifts, [memberId]: { ...(shifts[memberId] ?? {}), [date]: SHIFT_CYCLE[nextIdx] } });
  }

  function getShift(memberId: string, date: string): ShiftType {
    return shifts[memberId]?.[date] ?? "off";
  }

  function countShifts(memberId: string): Record<ShiftType, number> {
    const counts: Record<ShiftType, number> = { day1: 0, day2: 0, night1: 0, night2: 0, off: 0, paid: 0, comp: 0, training: 0 };
    days.forEach(d => { counts[getShift(memberId, dateKey(d))]++; });
    return counts;
  }

  // セルの違反チェック
  type Violation = { type: "interval"; intervalH: number } | { type: "consecutive"; days: number };
  function getCellViolations(memberId: string, date: string): Violation[] {
    const violations: Violation[] = [];
    const shift = getShift(memberId, date);

    // 連続勤務チェック
    if (!REST_TYPES.includes(shift)) {
      const consecutive = calcConsecutiveDays(memberId, date, shifts);
      if (consecutive > MAX_CONSECUTIVE_DAYS) {
        violations.push({ type: "consecutive", days: consecutive });
      }
    }

    // インターバルチェック（前日のシフトとの間隔）
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = dateKey(prevDate);
    const prevShift = getShift(memberId, prevKey);
    if (SHIFT_CONFIG[prevShift].endH !== null && SHIFT_CONFIG[shift].startH !== null) {
      const interval = calcInterval(prevShift, shift, prevKey, date);
      if (interval !== null && interval < MIN_INTERVAL_H) {
        violations.push({ type: "interval", intervalH: Math.round(interval * 10) / 10 });
      }
    }

    return violations;
  }

  // 全体の違反数（バッジ表示用）
  const totalViolations = members.reduce((sum, member) =>
    sum + days.reduce((s, d) => s + getCellViolations(member.id, dateKey(d)).length, 0), 0);

  function addMember() {
    if (!newMemberName.trim()) return;
    saveMembers([...members, { id: crypto.randomUUID(), name: newMemberName.trim() }]);
    setNewMemberName("");
  }

  function updateMemberName(id: string, name: string) {
    saveMembers(members.map(m => m.id === id ? { ...m, name } : m));
    setEditingMember(null);
  }

  function removeMember(id: string) {
    saveMembers(members.filter(m => m.id !== id));
    const updated = { ...shifts };
    delete updated[id];
    saveShifts(updated);
  }

  const today = dateKey(new Date());

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg">← Prev</button>
        <div className="text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            {days[0].getFullYear()} WW{String(getISOWeek(days[0])).padStart(2, "0")}
          </p>
          <p className="text-sm font-semibold text-gray-700">
            {MON_EN[days[0].getMonth()]} {days[0].getDate()} – {MON_EN[days[6].getMonth()]} {days[6].getDate()}
          </p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-500 hover:underline">This week</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg">Next →</button>
      </div>

      {/* 法令遵守バナー */}
      <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
        totalViolations > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
      }`}>
        <span className="text-lg">{totalViolations > 0 ? "⚠️" : "✅"}</span>
        <div>
          <p className="font-semibold">
            {totalViolations > 0 ? `法令違反リスク ${totalViolations}件` : "法令遵守 — 問題なし"}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            勤務間インターバル11時間以上 / 連続勤務14日以下（労働基準法 2026年後半適用予定）
          </p>
        </div>
      </div>

      {/* Shift legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG[ShiftType]][]).map(([key, cfg]) => (
          <span key={key} className={`text-xs px-2.5 py-1 rounded-full border ${cfg.color}`}>
            {cfg.label}{cfg.time ? ` ${cfg.time}` : ""}
          </span>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">← クリックで切り替え</span>
      </div>

      {/* Schedule grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-24">メンバー</th>
              {days.map((d, i) => (
                <th key={i} className={`px-2 py-2.5 text-center text-xs font-medium min-w-[72px] ${
                  dateKey(d) === today ? "text-[#003087]" : i >= 5 ? "text-red-400" : "text-gray-500"
                }`}>
                  <div>{DOW_EN[i]}</div>
                  <div className={`text-base font-bold ${dateKey(d) === today ? "text-[#003087]" : ""}`}>
                    {d.getDate()}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap">週計</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => {
              const counts = countShifts(member.id);
              return (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2">
                    {editingMember === member.id ? (
                      <input autoFocus defaultValue={member.name}
                        onBlur={e => updateMemberName(member.id, e.target.value)}
                        onKeyDown={e => e.key === "Enter" && updateMemberName(member.id, (e.target as HTMLInputElement).value)}
                        className="text-sm border-b border-[#003087] outline-none w-20" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingMember(member.id)}
                          className="text-sm font-medium text-gray-700 hover:text-[#003087]">{member.name}</button>
                        <button onClick={() => removeMember(member.id)}
                          className="text-gray-200 hover:text-red-400 text-xs">×</button>
                      </div>
                    )}
                  </td>
                  {days.map((d, i) => {
                    const key = dateKey(d);
                    const shift = getShift(member.id, key);
                    const cfg = SHIFT_CONFIG[shift];
                    const violations = getCellViolations(member.id, key);
                    const hasViolation = violations.length > 0;
                    return (
                      <td key={i} className="px-1 py-1.5 text-center relative">
                        <button onClick={() => cycleShift(member.id, key)}
                          className={`w-[68px] text-xs py-1.5 rounded-lg border font-medium transition-colors relative ${
                            hasViolation ? "ring-2 ring-red-400 ring-offset-1" : ""
                          } ${cfg.color}`}
                          title={hasViolation ? violations.map(v =>
                            v.type === "interval"
                              ? `⚠ インターバル${v.intervalH}h（11h必要）`
                              : `⚠ 連続${v.days}日（14日以下必要）`
                          ).join("\n") : cfg.time}
                        >
                          {cfg.label}
                          {hasViolation && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                              {violations.length}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-xs text-gray-400 text-center whitespace-nowrap">
                    <div>日{counts.day1 + counts.day2} 夜{counts.night1 + counts.night2}</div>
                    <div>有{counts.paid} 代{counts.comp}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add member */}
        <div className="flex gap-2 p-3 border-t border-gray-100">
          <input value={newMemberName} onChange={e => setNewMemberName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMember()}
            placeholder="メンバー追加..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none" />
          <button onClick={addMember}
            className="px-3 py-1.5 text-sm bg-[#003087] text-white rounded-lg hover:bg-[#00409e]">追加</button>
        </div>
      </div>

      {/* 法令説明 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-500 space-y-1.5">
        <p className="font-semibold text-gray-600">📋 適用法令（2026年後半予定）</p>
        <p>・<span className="font-medium text-gray-700">勤務間インターバル11時間</span> — 終業から次の始業まで11時間以上の休息が必要</p>
        <p>・<span className="font-medium text-gray-700">連続勤務14日以下</span> — 14日を超える連続勤務は禁止（週休2日相当）</p>
        <p>・<span className="font-medium text-gray-700">1ヶ月変形労働時間制</span> — 週平均40時間以内（現行法準拠）</p>
        <p className="text-gray-400 pt-1">※ 2026年4月時点では改正案審議中。施行時期は要確認。</p>
      </div>
    </div>
  );
}
