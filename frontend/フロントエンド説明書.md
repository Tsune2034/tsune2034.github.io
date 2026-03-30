# KAIROX フロントエンド

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 で構築された KAIROX のフロントエンドアプリ。

**本番URL:** https://frontend-psi-seven-15.vercel.app
**デプロイ:** Vercel（自動デプロイ）

---

## 開発環境のセットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数ファイルの作成
cp .env.local.example .env.local

# 開発サーバー起動（http://localhost:3000）
npm run dev

# 本番ビルド確認
npm run build
```

---

## 環境変数（`.env.local`）

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
API_KEY=your-admin-api-key
```

---

## ディレクトリ構成

```
app/
├── page.tsx                # ルートページ（Stripe Elements ラッパー）
├── layout.tsx              # レイアウト（フォント・メタデータ）
├── globals.css             # グローバルスタイル（marqueeアニメーション等）
├── i18n.ts                 # 多言語翻訳データ（EN/JA/ZH/KO 1100行+）
│
├── Dashboard.tsx           # メインUI（予約フォーム5ステップ・GPS割引テロップ）
├── TrackingView.tsx        # 配送追跡画面（ドライバー位置・ETA）
├── BusinessView.tsx        # 法人急行プランページ + ドライバー登録
├── AdminView.tsx           # 管理者ダッシュボード（PIN認証）
├── ChatWidget.tsx          # AIチャットサポート（フローティング）
│
└── api/
    ├── booking/route.ts    # GET/POST/PUT → FastAPI /bookings プロキシ
    ├── chat/route.ts       # POST → Anthropic API プロキシ
    ├── payment/route.ts    # POST → Stripe API プロキシ
    ├── driver-register/route.ts  # POST → FastAPI /drivers/register プロキシ
    └── admin/route.ts      # GET → FastAPI /admin/* プロキシ（API Key認証）
```

---

## 多言語対応（i18n）

翻訳データは `app/i18n.ts` に集約されています。

```typescript
// 翻訳キーの使い方
const { tr } = useLocale();  // Dashboard内ではpropsで受け取る
// tr.nav_book, tr.nav_track, tr.nav_business ...
```

**新しい翻訳キーを追加するとき:**
1. `i18n.ts` の `Translation` 型に追加
2. `en` / `ja` / `zh` / `ko` の4ロケールすべてに値を追加
3. コンポーネントで `{tr.your_key}` を使用

---

## 主要コンポーネント

### Dashboard.tsx

メインUIを担うコンポーネント。以下を含む:

- `DriverNearbyTicker` — GPS近接ドライバー割引テロップ
- `SpotPicker` — 集荷スポット・配送先スポット選択カード
- `StepContact` / `StepLuggage` / `StepPickup` / `StepPayment` / `StepConfirm` — 予約5ステップ
- `getPickupSpots(tr)` / `getHotelDeliverySpots(tr)` / `getAirportDeliverySpots(tr)` — 翻訳対応スポット関数
- `getFlightSlots(tr)` — 翻訳対応急行便スロット関数

### AdminView.tsx

管理者専用ダッシュボード。

- PIN認証（環境変数 `ADMIN_PIN`）
- 統計カード（総予約数・完了・売上・ドライバー数）
- 予約一覧タブ / ドライバー一覧タブ

---

## デプロイ

```bash
# 通常デプロイ
vercel deploy --prod

# キャッシュを無視して強制デプロイ（ビルドエラー時）
vercel deploy --prod --force
```

---

## 既知の制限・TODO

| 項目 | 状態 |
|------|------|
| Stripe本番キー | ⬜ 要設定（現在テストモード）|
| Resendドメイン認証 | ⬜ kairox.jp DNS設定待ち |
| JPYCウォレットアドレス | ⬜ プレースホルダーのまま |
| ADMIN_PIN環境変数化 | ⬜ 現在ハードコード（本番前に必須）|
| GET /drivers/active | ⬜ 未実装（GPSテロップが実ドライバー未連動）|
