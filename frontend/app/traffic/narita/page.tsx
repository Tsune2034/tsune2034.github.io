import Link from "next/link";

const ROUTES = [
  { name: "東関東自動車道（成田IC → 千葉北IC）", distance: "約30km", normal: "約25分", rush: "約60〜90分", type: "highway" },
  { name: "京葉道路（千葉IC → 箱崎IC）", distance: "約35km", normal: "約35分", rush: "約70〜100分", type: "highway" },
  { name: "国道51号（成田市街 → 千葉市）", distance: "約40km", normal: "約50分", rush: "約80〜120分", type: "local" },
  { name: "国道357号（千葉港 → お台場）", distance: "約30km", normal: "約40分", rush: "約70〜90分", type: "local" },
];

const TIPS = [
  { time: "平日 7:00〜9:30", level: "jam", desc: "東関東道・京葉道路 上り線が慢性渋滞。千葉北IC〜宮野木JCT間は特に注意。" },
  { time: "平日 17:00〜20:00", level: "jam", desc: "帰宅ラッシュで全ルート混雑。国道51号・357号も断続的に渋滞。" },
  { time: "土日・祝日", level: "slow", desc: "観光客・レジャー渋滞。10:00〜18:00は全ルート混雑気味。" },
  { time: "連休初日・最終日", level: "jam", desc: "帰省・旅行ラッシュで最大3倍の所要時間になることがある。" },
  { time: "平日 10:00〜16:00", level: "clear", desc: "比較的スムーズ。この時間帯の移動が最も効率的。" },
];

const LEVEL_STYLE: Record<string, string> = {
  jam:   "bg-red-500/15 border-red-500/40 text-red-400",
  slow:  "bg-amber-500/15 border-amber-500/40 text-amber-400",
  clear: "bg-green-500/15 border-green-500/40 text-green-400",
};
const LEVEL_LABEL: Record<string, string> = { jam: "渋滞", slow: "混雑", clear: "順調" };

export default function NaritaTrafficPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="max-w-2xl mx-auto space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/traffic" className="text-amber-400 font-black tracking-tight">KAIROX</Link>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-bold text-white">成田空港 渋滞情報</span>
          </div>
          <p className="text-[11px] text-gray-500">東関東道・京葉道路・国道51号 リアルタイム＆渋滞傾向</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-6">

        {/* Live map link */}
        <Link href="/traffic" className="block bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-amber-400">リアルタイム渋滞マップを見る</p>
            <p className="text-[11px] text-gray-500 mt-0.5">成田・羽田 関東全域をマップで確認</p>
          </div>
          <span className="text-amber-400 font-bold">→</span>
        </Link>

        {/* Route table */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">主要ルート 所要時間の目安</h2>
          {ROUTES.map((r) => (
            <div key={r.name} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-200">{r.name}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{r.distance} · {r.type === "highway" ? "🛣️ 高速" : "🏘️ 一般道"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-green-500/10 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-[9px] text-gray-500">通常時</p>
                  <p className="text-xs font-bold text-green-400">{r.normal}</p>
                </div>
                <div className="bg-red-500/10 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-[9px] text-gray-500">渋滞時</p>
                  <p className="text-xs font-bold text-red-400">{r.rush}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time tips */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">時間帯別 渋滞傾向</h2>
          {TIPS.map((t) => (
            <div key={t.time} className="flex items-start gap-3 bg-gray-900/60 border border-gray-800 rounded-xl px-3.5 py-2.5">
              <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${LEVEL_STYLE[t.level]}`}>
                {LEVEL_LABEL[t.level]}
              </span>
              <div>
                <p className="text-xs font-semibold text-gray-300">{t.time}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SEO text */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">成田空港から都心への渋滞回避ガイド</h2>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              成田空港から東京都心まで最短ルートは東関東自動車道経由で約60〜80kmです。
              渋滞がなければ約60分ですが、朝夕のラッシュ時や週末・連休は2倍以上かかることがあります。
              成田エクスプレス（NEX）やリムジンバスを使うと渋滞の影響を受けにくいですが、
              大きな荷物を持っての移動は体力的に負担になります。
            </p>
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">荷物を持たずに移動する方法</h2>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              KAIROXの手ぶら配送サービスを使えば、成田空港に着いた瞬間から身軽に観光できます。
              荷物はホテルへ先送りされるため、渋滞した道路でも電車・バスでも荷物の心配が不要です。
              成田空港発・都内主要ホテルへの配達対応。カウンター不要・締め切りなし。
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-amber-400">荷物を預けて手ぶら観光</p>
            <p className="text-[11px] text-gray-500 mt-0.5">成田空港発 — ホテルまで先に届けます</p>
          </div>
          <Link href="/narita" className="shrink-0 bg-amber-500 text-gray-950 font-black text-xs px-4 py-2.5 rounded-xl hover:bg-amber-400 transition-colors">
            無料で予約 →
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 pt-4 text-center">
          <p className="text-[10px] text-gray-700">© 2026 KAIROX — Japan Luggage Freedom</p>
        </div>
      </div>
    </div>
  );
}
