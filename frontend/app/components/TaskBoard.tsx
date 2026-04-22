"use client";

import { useState, useEffect } from "react";
import type { Lang } from "../page";

const T = {
  ja: {
    newTask: "+ 新規タスク", save: "保存", cancel: "キャンセル",
    title: "タイトル *", category: "カテゴリ", equipment: "設備名",
    priority: "優先度", assignee: "担当者", dueDate: "期限",
    detail: "詳細 / FA解析内容", rpnRef: "RPN参照（修理履歴より）",
    status: "ステータス", searchPlaceholder: "タスクを検索...",
    allPriority: "全優先度", overdue: "件 期限超過", overdueAlert: "期限超過タスクがあります",
    noTasks: "タスクなし。「+ 新規タスク」から追加してください。",
    noMatch: "該当するタスクがありません",
    copy: "コピー", delete: "削除",
    categories: { fa_report: "🔍 FA レポート", client_report: "📤 客先報告", maintenance: "🔧 メンテナンス", improvement: "📈 改善", other: "📋 その他" },
    statuses: { open: "Open", in_progress: "対応中", pending_client: "客先待ち", closed: "完了" },
    priorities: { critical: "Critical", high: "高", medium: "中", low: "低" },
  },
  en: {
    newTask: "+ New Task", save: "Save", cancel: "Cancel",
    title: "Title *", category: "Category", equipment: "Equipment",
    priority: "Priority", assignee: "Assignee", dueDate: "Due Date",
    detail: "Detail / FA Analysis", rpnRef: "RPN Reference (from FMEA Log)",
    status: "Status", searchPlaceholder: "Search tasks...",
    allPriority: "All Priority", overdue: " overdue", overdueAlert: "Overdue tasks exist",
    noTasks: "No tasks. Click \"+ New Task\" to add.",
    noMatch: "No matching tasks",
    copy: "Copy", delete: "Delete",
    categories: { fa_report: "🔍 FA Report", client_report: "📤 Client Report", maintenance: "🔧 Maintenance", improvement: "📈 Improvement", other: "📋 Other" },
    statuses: { open: "Open", in_progress: "In Progress", pending_client: "Pending Client", closed: "Closed" },
    priorities: { critical: "Critical", high: "High", medium: "Medium", low: "Low" },
  },
};

type Priority = "critical" | "high" | "medium" | "low";
type Status = "open" | "in_progress" | "pending_client" | "closed";
type Category = "fa_report" | "client_report" | "maintenance" | "improvement" | "other";

type Task = {
  id: string;
  title: string;
  detail: string;
  equipment: string;
  category: Category;
  priority: Priority;
  status: Status;
  assignee: string;
  dueDate: string;
  createdAt: string;
  rpnRef?: number; // 修理履歴のRPNと紐付け（任意）
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-red-100 text-red-800 border-red-300" },
  high:     { label: "High",     color: "bg-orange-100 text-orange-800 border-orange-300" },
  medium:   { label: "Medium",   color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  low:      { label: "Low",      color: "bg-gray-100 text-gray-600 border-gray-300" },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  open:           { label: "Open",            color: "bg-blue-50 text-blue-700" },
  in_progress:    { label: "In Progress",     color: "bg-indigo-50 text-indigo-700" },
  pending_client: { label: "Pending Client",  color: "bg-amber-50 text-amber-700" },
  closed:         { label: "Closed",          color: "bg-green-50 text-green-700" },
};

const CATEGORY_CONFIG_EN: Record<Category, string> = {
  fa_report:     "🔍 FA Report",
  client_report: "📤 Client Report",
  maintenance:   "🔧 Maintenance",
  improvement:   "📈 Improvement",
  other:         "📋 Other",
};

function newTask(): Task {
  return {
    id: crypto.randomUUID(),
    title: "",
    detail: "",
    equipment: "",
    category: "maintenance",
    priority: "medium",
    status: "open",
    assignee: "",
    dueDate: "",
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

function isOverdue(dueDate: string, status: Status): boolean {
  if (!dueDate || status === "closed") return false;
  return new Date(dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

export default function TaskBoard({ lang = "ja" }: { lang?: Lang }) {
  const tr = T[lang];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<Task>(newTask());
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("datj_tasks");
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  function save(updated: Task[]) {
    setTasks(updated);
    localStorage.setItem("datj_tasks", JSON.stringify(updated));
  }

  function addTask() {
    if (!form.title.trim()) return;
    save([form, ...tasks]);
    setForm(newTask());
    setShowForm(false);
  }

  function updateStatus(id: string, status: Status) {
    save(tasks.map(t => t.id === id ? { ...t, status } : t));
  }

  function deleteTask(id: string) { save(tasks.filter(t => t.id !== id)); }

  function copyTask(task: Task) {
    const text = [
      `【Task】${task.title}`,
      `Category: ${tr.categories[task.category]}`,
      `Equipment: ${task.equipment}`,
      `Priority: ${task.priority.toUpperCase()}`,
      `Status: ${tr.statuses[task.status]}`,
      `Due: ${task.dueDate || "-"}`,
      `Assignee: ${task.assignee || "-"}`,
      task.detail ? `Detail: ${task.detail}` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
  }

  const filtered = tasks.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search && ![t.title, t.equipment, t.assignee, t.detail].some(f => f.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const openCount = tasks.filter(t => t.status !== "closed").length;
  const overdueCount = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {(["open", "in_progress", "pending_client", "closed"] as Status[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            className={`rounded-xl border p-3 text-center transition-all ${
              filterStatus === s ? "ring-2 ring-[#003087]" : ""
            } ${STATUS_CONFIG[s].color} border-current/20`}>
            <p className="text-xl font-bold">{tasks.filter(t => t.status === s).length}</p>
            <p className="text-xs font-medium">{tr.statuses[s]}</p>
          </button>
        ))}
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <span>🚨</span>
          <span><strong>{overdueCount}{tr.overdue}</strong> — {tr.overdueAlert}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tr.searchPlaceholder}
          className="flex-1 min-w-[160px] text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none" />
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | "all")}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="all">{tr.allPriority}</option>
          {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
            <option key={p} value={p}>{tr.priorities[p]}</option>
          ))}
        </select>
        <button onClick={() => { setForm(newTask()); setShowForm(true); }}
          className="px-4 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg hover:bg-[#00409e] whitespace-nowrap">
          {tr.newTask}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700">{tr.newTask}</p>
          <div>
            <label className="text-xs text-gray-500">{tr.title}</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">{tr.category}</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value as Category})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 bg-white">
                {(Object.keys(tr.categories) as Category[]).map(k => (
                  <option key={k} value={k}>{tr.categories[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{tr.equipment}</label>
              <input value={form.equipment} onChange={e => setForm({...form, equipment: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">{tr.priority}</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as Priority})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 bg-white">
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
                  <option key={p} value={p}>{tr.priorities[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{tr.assignee}</label>
              <input value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">{tr.dueDate}</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">{tr.detail}</label>
            <textarea value={form.detail} onChange={e => setForm({...form, detail: e.target.value})}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1 resize-none" />
          </div>
          {form.category === "fa_report" && (
            <div>
              <label className="text-xs text-gray-500">{tr.rpnRef}</label>
              <input type="number" min={1} max={1000} value={form.rpnRef ?? ""}
                onChange={e => setForm({...form, rpnRef: Number(e.target.value)})}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 mt-1" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={addTask}
              className="flex-1 py-2 bg-[#003087] text-white text-sm font-medium rounded-lg">{tr.save}</button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">{tr.cancel}</button>
          </div>
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          {search || filterStatus !== "all" || filterPriority !== "all" ? tr.noMatch : tr.noTasks}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const overdue = isOverdue(task.dueDate, task.status);
            return (
              <div key={task.id} className={`bg-white rounded-xl border p-4 ${overdue ? "border-red-200" : "border-gray-200"}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_CONFIG[task.priority].color}`}>
                      {tr.priorities[task.priority]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[task.status]?.color ?? ""}`}>
                      {tr.statuses[task.status]}
                    </span>
                    <span className="text-xs text-gray-400">{tr.categories[task.category]}</span>
                    {overdue && <span className="text-xs text-red-500 font-medium">⚠ Overdue</span>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => copyTask(task)} className="text-xs text-gray-400 hover:text-gray-600">{tr.copy}</button>
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-red-300 hover:text-red-500">{tr.delete}</button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-800 mt-2">{task.title}</p>
                {task.equipment && <p className="text-xs text-gray-500 mt-0.5">📍 {task.equipment}</p>}
                {task.detail && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.detail}</p>}
                {task.rpnRef && (
                  <p className="text-xs mt-1">
                    <span className="text-gray-400">RPN ref: </span>
                    <span className={`font-medium ${task.rpnRef >= 200 ? "text-red-600" : task.rpnRef >= 100 ? "text-orange-600" : "text-gray-600"}`}>
                      {task.rpnRef}
                    </span>
                  </p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                  <div className="flex gap-3 text-xs text-gray-400">
                    {task.assignee && <span>👤 {task.assignee}</span>}
                    {task.dueDate && <span className={overdue ? "text-red-500 font-medium" : ""}>📅 {task.dueDate}</span>}
                  </div>
                  <select value={task.status} onChange={e => updateStatus(task.id, e.target.value as Status)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
                    {(Object.keys(tr.statuses) as Status[]).map(k => (
                      <option key={k} value={k}>{tr.statuses[k]}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
