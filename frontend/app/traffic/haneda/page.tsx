import Link from "next/link";

const ROUTES = [
  { name: "首都高速湾岸線（羽田IC → 有明JCT）", distance: "約15km", normal: "約15分", rush: "約40〜60分", type: "highway" },
  { name: "首都高1号羽田線（羽田IC → 浜崎橋JCT）", distance: "約12km", normal: "約12分", rush: "約35〜55分", type: "highway" },
  { name: "国道15号（第1京浜）（羽田 → 品川）", distance: "約14km", normal: "約25分", rush: "約50〜80分", type: "local" },
  { name: "羽田空港 → 横浜（国道15・16号）", distance: "約20km", normal: "約30分", rush: "約60〜90分", type: "local" },
];

const TIPS = [
  { time: "平日 7:00〜9:30", level: "jam", desc: "1号羽田線 上り線が慢性渋滞。浜崎橋JCT手前で特に停滞。湾岸線経由が比較的スムーズ。" },
  { time: "平日 17:00〜20:00", level: "jam", desc: "帰宅ラッシュ。羽田IC周辺・国道15号ともに混雑。空港への到着便も影響を受ける。" },
  { time: "土日・祝日 10:00〜18:00", level: "slow", desc: "観光・レジャー客で混雑。横浜方面は特に渋滞しやすい。" },
  { time: "連休初日・最終日", level: "jam", desc: "国内線増便×帰省ラッシュで最大3倍の所要時間になることがある。" },
  { time: "平日 10:00〜16:00", level: "clear", desc: "比較的スムーズ。この時間帯の移動が最も効率的。" },
];

const LEVEL_STYLE: Record<string, string> = {
  jam:   "bg-red-500/15 border-red-500/40 text-red-400",
  slow:  "bg-amber-500/15 border-amber-500/40 text-amber-400",
  clear: "bg-green-500/15 border-green-500/40 text-green-400",
};
const LEVEL_LABEL: Record<string, string> = { jam: "渋滞", slow: "混雑", clear: "順調" };

export default function HanedaTrafficPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="max-w-2xl mx-auto space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/traffic" className="text-amber-400 font-black tracking-tight">KAIROX</Link>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-bold text-white">羽田空港 渋滞情報</span>
          </div>
          <p className="text-[11px] text-gray-500">首都高湾岸線・1号羽田線・国道15号 リアルタイム＆渋滞傾向</p>
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
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">羽田空港から都心への渋滞回避ガイド</h2>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              羽田空港は都心から最も近い国際空港ですが、首都高速の慢性渋滞で思った以上に時間がかかることがあります。
              特に1号羽田線の浜崎橋JCT手前は東京屈指の渋滞スポットです。
              時間帯によっては湾岸線を迂回するか、都営浅草線・京急線での移動が効率的です。
            </p>
          </div>
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">荷物を持たずに移動する方法</h2>
            <p className="text-[11px px] text-gray-600 leading-relaxed">
              KAIROXの手ぶら配送サービスを使えば、羽田空港に着いた瞬間から身軽に移動できます。
              荷物はホテルへ先送りされるため、首都高が渋滞していても電車・モノレールで快適に移動できます。
              羽田空港T1・T2・T3対応。カウンター不要・締め切りなし。
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-amber-400">荷物を預けて手ぶら観光</p>
            <p className="text-[11px] text-gray-500 mt-0.5">羽田空港発 — ホテルまで先に届けます</p>
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
