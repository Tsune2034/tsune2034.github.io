export const metadata = { title: "KAIROX Ops Guide", robots: "noindex" };

const LINKS = [
  { label: "予約画面（顧客向け）",  href: "/narita",         desc: "テスト予約はここから作成" },
  { label: "ドライバーポータル",    href: "/driver",         desc: "DRIVER_PIN で入る" },
  { label: "管理画面",             href: "/admin",          desc: "ADMIN_PIN で入る・テスト予約作成・GPS学習" },
  { label: "追跡サンプル",         href: "/narita/status/KRX-TEST", desc: "追跡URLの動作確認用" },
];

const STEPS = [
  { n: 1, title: "テスト予約を作成", detail: "管理画面（/admin）→「テスト予約作成」フォームで予約ID を発行" },
  { n: 2, title: "ドライバーポータルにログイン", detail: "/driver にアクセス → DRIVER_PIN を入力" },
  { n: 3, title: "配達ステータスを進める", detail: "「向かっています」→「近くにいます」→「荷物を受け取り中」→「配達完了」" },
  { n: 4, title: "受取写真・完了写真を撮影", detail: "各ステータス変更時に証跡写真をアップロード" },
  { n: 5, title: "追跡URLを確認", detail: "/narita/status/[予約ID] で顧客側の表示を確認" },
  { n: 6, title: "気づいた問題をメモ", detail: "帰宅後に agents/tasks.json にタスクとして追加" },
];

const PINS = [
  { role: "DRIVER_PIN",  use: "ドライバーポータル（/driver）" },
  { role: "ADMIN_PIN",   use: "管理画面（/admin）" },
  { role: "PLAYER_PIN",  use: "プレイヤー画面（/player）" },
];

export default function OpsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8 max-w-lg mx-auto">
      <div className="mb-8">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400">
          KAIROX
        </span>
        <h1 className="mt-3 text-xl font-bold">Ops Guide</h1>
        <p className="text-sm text-gray-400 mt-1">成田テスト走行・運用マニュアル</p>
      </div>

      {/* リンク集 */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">リンク一覧</h2>
        <div className="space-y-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-blue-500/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-blue-400">{l.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{l.desc}</div>
                <div className="text-xs text-gray-700 mt-0.5 font-mono">kairox.jp{l.href}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* テストフロー */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">テスト手順</h2>
        <div className="space-y-2">
          {STEPS.map((s) => (
            <div key={s.n} className="flex gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                {s.n}
              </span>
              <div>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PIN情報 */}
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">PIN 設定場所</h2>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 mb-3">
          PINの値は Vercel Dashboard → Settings → Environment Variables で確認・変更できます
        </div>
        <div className="space-y-2">
          {PINS.map((p) => (
            <div key={p.role} className="flex justify-between items-center p-3 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-xs font-mono text-green-400">{p.role}</span>
              <span className="text-xs text-gray-400">{p.use}</span>
            </div>
          ))}
        </div>
      </section>

      {/* チェックリスト */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">テスト後チェック</h2>
        <div className="space-y-1 text-sm text-gray-300">
          {[
            "GPS追跡は正常に更新されたか",
            "ステータス変更が追跡画面に反映されたか",
            "受取・完了写真がアップロードできたか",
            "フライトボードにフライト情報が表示されたか",
            "改善点・バグをメモしたか",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 p-2 rounded-lg bg-gray-900/50">
              <span className="text-gray-600 mt-0.5">☐</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-gray-700">KAIROX Intelligence — internal only</p>
    </div>
  );
}
