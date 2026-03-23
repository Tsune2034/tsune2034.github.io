# KAIROX Engineer Agent — 実装・デプロイルール

## 役割

このドキュメントは KAIROX の実装・デプロイを担当する Engineer エージェントのルールブックです。
コード変更からデプロイまで、このチェックリストに沿って作業してください。

---

## スタック早見表

| レイヤー | 技術 | 場所 |
|---------|------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript + Tailwind CSS | `/frontend` |
| デプロイ | Vercel (`vercel --prod`) | https://frontend-psi-seven-15.vercel.app |
| バックエンド | FastAPI + PostgreSQL | Railway（別リポジトリ） |
| 決済 | Stripe + JPYC/USDC | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| メール | Resend HTTP API | `RESEND_API_KEY` |
| フライト情報 | Aviationstack | `AVIATIONSTACK_API_KEY` |

---

## ディレクトリ構成

```
frontend/
├── app/
│   ├── narita/
│   │   ├── page.tsx        メイン予約画面（4言語・全ステップ）
│   │   ├── layout.tsx      OGP・メタタグ
│   │   └── status/[id]/    予約追跡ページ
│   ├── driver/
│   │   └── page.tsx        ドライバー専用（PIN認証）
│   ├── api/
│   │   ├── booking/        予約 CRUD（バックエンドプロキシ）
│   │   ├── send-confirmation/  確認メール（Resend）
│   │   ├── flights/        フライト情報（Aviationstack）
│   │   ├── drivers-active/ アクティブドライバー数
│   │   ├── payment/        Stripe決済
│   │   ├── chat/           AIチャット
│   │   └── admin/          管理者API
│   ├── DriverView.tsx      ドライバー管理UI（PIN・GPS・フライトボード）
│   ├── i18n.ts             翻訳オブジェクト（t.en / t.ja / t.zh / t.ko）
│   └── page.tsx            / → /narita リダイレクト
```

---

## 実装チェックリスト

### コード変更前

- [ ] 変更対象ファイルを `Read` ツールで必ず読む（推測で編集しない）
- [ ] `agents/tasks.json` で該当タスクの `status` を `in_progress` に更新

### コーディング中

- [ ] **4言語対応:** `TR.en / TR.ja / TR.zh / TR.ko` に同じキーを追加したか
- [ ] **型安全:** `type Tr = { [K in keyof typeof TR.en]: string }` が型チェックしてくれる
- [ ] **新 state 追加時:** `reset()` 関数に含めたか（ページリセット時に残留しないよう）
- [ ] **API呼び出し:** エラー時のフォールバックを実装したか
- [ ] **ハードコード禁止:** URL・PIN・APIキーを直書きしない（env var 化）
- [ ] `writer.md` のコピールールに沿ったテキストか

### デプロイ前

```bash
# 1. TypeScript エラーチェック（エラーゼロを確認）
npx tsc --noEmit

# 2. ビルド確認（ローカルで通るか）
npm run build

# 3. 変更ファイルを確認
git diff --stat
```

- [ ] `npx tsc --noEmit` エラーなし
- [ ] `npm run build` 成功
- [ ] 意図しないファイルが変更されていないか `git diff` で確認

### コミット

```bash
git add <変更ファイル>  # git add -A は使わない
git commit -m "feat/fix/chore/docs: 変更内容の要約（日本語OK）"
```

コミットメッセージプレフィックス:

| プレフィックス | 用途 |
|--------------|------|
| `feat:` | 新機能 |
| `fix:` | バグ修正 |
| `chore:` | 設定・ツール・依存関係 |
| `docs:` | ドキュメントのみ |
| `refactor:` | 動作変更なしのコード整理 |

### デプロイ

```bash
vercel --prod
```

- [ ] ビルドログに `✓ Compiled successfully` が出ていること
- [ ] Route 一覧で追加・削除したルートが正しく反映されているか確認
- [ ] `Aliased: https://frontend-psi-seven-15.vercel.app` で完了を確認

### デプロイ後

- [ ] `agents/tasks.json` の該当タスクを `completed` に移動
- [ ] `docs/リリースノート_vX.X.X.md` を更新（大きな変更のみ）

---

## よくあるミスと対策

### ① TR キーが1言語だけ追加されてビルドエラー

**症状:** `Type '{ en: ...; ja: ...; zh: ...; ko: ... }' is not assignable`
**対策:** TR の 4言語ブロック全てに同じキーを追加する。`writer.md` のテンプレートを使う。

---

### ② `reset()` に新 state を含め忘れ

**症状:** 「新しい予約」ボタンを押しても前の入力が残る
**対策:** state を追加したら必ず `reset()` 関数に `setXxx("")` を追加する。

```ts
// app/narita/page.tsx の reset() を必ず確認
function reset() {
  setStep("pickup");
  setPickupLabel("");
  setDest(null);
  setBags(1);
  setName("");
  setPhone("");
  setEmail("");       // ← 追加した state はここにも追加
  setBookingId(null);
  setAiConfirmMsg("");
  setMatchPhase("searching");
}
```

---

### ③ バックエンドが落ちていても予約フローをブロックする

**症状:** バックエンド障害時に予約が完全に止まる
**対策:** API 呼び出しは必ず `try/catch` でラップし、フロントエンド生成のフォールバックIDを用意する。

```ts
try {
  const res = await fetch(`${API_URL}/bookings`, { ... });
  if (res.ok) {
    const data = await res.json();
    if (data.booking_id) setBookingId(data.booking_id);
  }
} catch {
  // バックエンド障害時はフロントエンド生成IDで続行
}
setStep("matching"); // catch の後でも必ず進む
```

---

### ④ `git add -A` で不要ファイルをコミット

**症状:** `.env.local` や `node_modules` が混入
**対策:** 常に `git add <ファイル名>` で個別追加。`git diff --staged` で確認してからコミット。

---

### ⑤ Vercel 環境変数の変更がデプロイに反映されない

**症状:** env var を Dashboard で変更したのに動作しない
**対策:** 変数変更後は必ず再デプロイ (`vercel --prod`) を実行。

---

## 環境変数一覧

| 変数名 | 用途 | 設定場所 |
|--------|------|---------|
| `NEXT_PUBLIC_API_URL` | バックエンドURL | Vercel env vars |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe公開キー | Vercel env vars |
| `RESEND_API_KEY` | メール送信 | Vercel env vars |
| `RESEND_FROM` | 送信元アドレス | Vercel env vars |
| `AVIATIONSTACK_API_KEY` | フライト情報 | Vercel env vars（サーバーサイドのみ） |
| `NEXT_PUBLIC_AVIATIONSTACK_MOCK` | `1`=モック / `0`=本番 | Vercel env vars |
| `NEXT_PUBLIC_APP_URL` | 追跡URL生成用ベースURL | Vercel env vars |

**`NEXT_PUBLIC_` プレフィックスはクライアントサイドに公開される。秘密情報には絶対使わない。**

---

## APIルート実装パターン

新しい API ルートを作るときのテンプレート:

```ts
// app/api/xxx/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/xxx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 });
  }
}
```

---

## デプロイ後確認URL

| 確認項目 | URL |
|---------|-----|
| メイン画面 | https://frontend-psi-seven-15.vercel.app/narita |
| ドライバー画面 | https://frontend-psi-seven-15.vercel.app/driver |
| 予約追跡 | https://frontend-psi-seven-15.vercel.app/narita/status/KRX-TEST |
| Vercel ダッシュボード | https://vercel.com/tsune2034s-projects/frontend |

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-03-23 | 初版作成。v0.10.0 時点の構成・ルールを整理 |
