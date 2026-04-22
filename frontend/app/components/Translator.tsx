"use client";

import { useState } from "react";

const DOC_TYPES = [
  { value: "maintenance", label: "メンテナンスレポート" },
  { value: "shift",       label: "シフト引き継ぎ" },
  { value: "plc",         label: "PLCアラーム・障害" },
  { value: "daily",       label: "デイリーオペレーション" },
  { value: "training",    label: "トレーニング資料" },
  { value: "general",     label: "一般（BHS関連）" },
];

const QUICK_PHRASES = [
  "ベルトコンベアの張り調整を実施した。",
  "PLCアラームが発生し、リセット対応を行った。",
  "センサー検知不良のため、清掃および位置調整を実施した。",
  "モーター過負荷トリップ発生。異物噛み込みを確認、除去後に復旧。",
  "エマージェンシーストップが作動。安全確認後に解除。",
  "定期点検を実施。異常なし。",
  "次シフトへの申し送り事項：",
];

const GLOSSARY = [
  ["BHS", "Baggage Handling System"],
  ["EBS", "Early Bag Storage"],
  ["ATR", "Automatic Tag Reader"],
  ["E-STOP", "Emergency Stop"],
  ["PLC", "Programmable Logic Controller"],
  ["ジャム", "Baggage Jam"],
  ["インバーター", "Inverter / VFD"],
  ["過負荷トリップ", "Overload Trip"],
  ["申し送り", "Shift Handover"],
  ["定期点検", "Preventive Maintenance"],
];

export default function Translator() {
  const [input, setInput]       = useState("");
  const [output, setOutput]     = useState("");
  const [docType, setDocType]   = useState("maintenance");
  const [direction, setDirection] = useState<"ja2en" | "en2ja">("ja2en");
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

  async function translate() {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, docType, direction }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOutput(data.result);
    } catch (e: unknown) {
      setOutput(`エラー: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setLoading(false);
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function addPhrase(phrase: string) {
    setInput(prev => prev ? prev + "\n" + phrase : phrase);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">文書タイプ</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800"
            >
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">翻訳方向</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setDirection("ja2en")}
                className={`px-3 py-1.5 ${direction === "ja2en" ? "bg-[#003087] text-white" : "bg-white text-gray-600"}`}
              >日 → EN</button>
              <button
                onClick={() => setDirection("en2ja")}
                className={`px-3 py-1.5 ${direction === "en2ja" ? "bg-[#003087] text-white" : "bg-white text-gray-600"}`}
              >EN → 日</button>
            </div>
          </div>
        </div>

        {/* Quick phrases */}
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-1.5">クイック挿入</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PHRASES.map(p => (
              <button
                key={p}
                onClick={() => addPhrase(p)}
                className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors"
              >
                {p.slice(0, 14)}…
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input / Output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-xs font-medium text-gray-500 mb-2">入力テキスト</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={10}
            placeholder="翻訳するテキストを入力..."
            className="w-full text-sm text-gray-800 resize-none outline-none placeholder-gray-300"
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-medium text-gray-500">翻訳結果</label>
            {output && (
              <button
                onClick={copyOutput}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {copied ? "✓ コピー済み" : "コピー"}
              </button>
            )}
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap min-h-[200px]">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-[#003087] rounded-full animate-spin" />
                翻訳中...
              </div>
            ) : output || <span className="text-gray-300">ここに翻訳結果が表示されます</span>}
          </div>
        </div>
      </div>

      {/* Translate button */}
      <button
        onClick={translate}
        disabled={loading || !input.trim()}
        className="w-full py-3 bg-[#003087] text-white rounded-xl font-medium hover:bg-[#00409e] disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
      >
        {loading ? "翻訳中..." : "翻訳する"}
      </button>

      {/* Glossary */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium text-gray-600"
        >
          <span>BHS / PLC 用語集</span>
          <span className="text-gray-400">{showGlossary ? "▲" : "▼"}</span>
        </button>
        {showGlossary && (
          <div className="px-4 pb-4 grid grid-cols-2 gap-x-8 gap-y-1 border-t border-gray-100 pt-3">
            {GLOSSARY.map(([ja, en]) => (
              <div key={ja} className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="font-medium text-gray-700">{ja}</span>
                <span className="text-gray-400">{en}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
