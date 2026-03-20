# KAIROX — 手ぶら観光急行配送プラットフォーム

> 訪日外国人観光客・半導体エンジニア向け。北海道・千歳エリア起点の当日急行荷物配送サービス。

**本番URL:** https://frontend-psi-seven-15.vercel.app
**現在バージョン:** v0.7.0
**ステータス:** 開発完了 → 開業準備中

---

## サービス概要

KAIROXは、観光客が荷物を手放して観光を楽しめるよう、スーツケース・ショッピングバッグをホテルや空港まで当日中に届ける急行配送プラットフォームです。

- **対応エリア（MVP）:** 千歳・苫小牧・北広島 / 札幌市内 / 小樽 / 富良野・美瑛（旭川空港経由）
- **対応言語:** 英語 / 日本語 / 繁體中文 / 한국어
- **決済方法:** クレジットカード（Stripe）/ JPYC on Polygon / USDC on Solana

---

## リポジトリ構成

```
kairox/
├── frontend/          # Next.js 16 App Router (Vercel)
│   ├── app/
│   │   ├── page.tsx            # エントリーポイント
│   │   ├── Dashboard.tsx       # メインUI（5ステップ予約・追跡・法人）
│   │   ├── TrackingView.tsx    # 配送追跡画面
│   │   ├── BusinessView.tsx    # 法人向け急行プランページ
│   │   ├── AdminView.tsx       # 管理者ダッシュボード（PIN認証）
│   │   ├── ChatWidget.tsx      # AIチャットサポート（Claude haiku）
│   │   ├── i18n.ts             # 多言語翻訳データ（EN/JA/ZH/KO）
│   │   └── api/
│   │       ├── booking/        # 予約API プロキシ
│   │       ├── chat/           # Claude AI プロキシ
│   │       ├── payment/        # Stripe プロキシ
│   │       ├── driver-register/# ドライバー登録プロキシ
│   │       └── admin/          # 管理者API プロキシ
│   └── public/
│       └── sop-v1.html         # 標準操作手順書（SOP v1.0）
├── backend/           # FastAPI + PostgreSQL (Railway)
│   ├── main.py                 # エンドポイント定義
│   ├── models.py               # Pydanticスキーマ
│   ├── database.py             # SQLAlchemy ORM + DB操作
│   ├── matching.py             # 相乗りマッチングエンジン（Claude AI）
│   ├── briefing.py             # AIブリーフィング生成
│   ├── scheduler.py            # スケジューラー
│   └── email.py（予定）        # Resendメール送信
├── docs/
│   ├── spec.md                 # 製品仕様書
│   ├── requirements.md         # 要件定義書
│   ├── business_plan.md        # 事業計画書 v1.2
│   ├── architecture.md         # システム設計図
│   ├── pitch_deck.md           # ピッチデッキ（15スライド）
│   ├── release_notes.md        # リリースノート
│   └── meeting_minutes_20260320.md  # AIチーム会議議事録
├── tests/
│   └── test_briefing.py
├── requirements.txt
├── runtime.txt
├── Procfile
└── railway.toml
```

---

## クイックスタート

### フロントエンド

```bash
cd frontend
npm install
cp .env.local.example .env.local   # 環境変数を設定
npm run dev
```

### バックエンド

```bash
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload
```

---

## 環境変数

### フロントエンド（`frontend/.env.local`）

| 変数名 | 説明 | 例 |
|--------|------|----|
| `NEXT_PUBLIC_API_URL` | バックエンドURL | `https://your-app.railway.app` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe公開鍵 | `pk_live_...` |
| `API_KEY` | 管理者APIキー | ランダム文字列 |

### バックエンド（`backend/.env`）

| 変数名 | 説明 | 例 |
|--------|------|----|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql://user:pass@host/db` |
| `ANTHROPIC_API_KEY` | Claude API キー | `sk-ant-...` |
| `STRIPE_SECRET_KEY` | Stripe秘密鍵 | `sk_live_...` |
| `API_KEY` | 管理者APIキー（フロントと同じ値） | ランダム文字列 |
| `RESEND_API_KEY` | メール送信APIキー | `re_...` |
| `RESEND_FROM` | 送信元メール | `noreply@kairox.jp` |
| `ADMIN_PIN` | 管理画面PINコード | 6桁数字（本番前に変更必須） |

---

## デプロイ

### フロントエンド（Vercel）

```bash
cd frontend
vercel deploy --prod
```

### バックエンド（Railway）

Railway ダッシュボードからGitHub連携で自動デプロイ。
`railway.toml` に設定済み。

---

## 主要機能

### エンドユーザー向け

| 機能 | 状態 | 説明 |
|------|------|------|
| 5ステップ予約フォーム | ✅ 完了 | 連絡先 → 荷物 → 集荷先 → 支払い → 確認 |
| 急行便スロット選択 | ✅ 完了 | 国際線フライト時刻連動（4便）|
| 相乗りマッチング | ✅ 完了 | Claude AI による最適グループ化 |
| ホテル検索 | ✅ 完了 | 千歳・札幌・小樽・富良野 計50件以上 |
| 配送追跡 | ✅ 完了 | トラッキング番号入力 + タイムライン表示 |
| ドライバーGPS追跡 | ✅ 完了 | リアルタイム距離・ETA表示 |
| AIチャットサポート | ✅ 完了 | Claude haiku-4-5 / 4言語対応 |
| Stripe決済 | ⚠️ テスト中 | 本番キー設定待ち |
| JPYC決済 | ⚠️ 設定待ち | ウォレットアドレス未設定 |
| USDC決済 | ✅ UI完了 | Polygon / Solana QRコード表示 |
| メール通知 | ⚠️ 設定待ち | Resendドメイン認証待ち |
| 4言語対応 | ✅ 完了 | EN / JA / ZH / KO 全画面 |

### 管理者・ドライバー向け

| 機能 | 状態 | 説明 |
|------|------|------|
| 管理者ダッシュボード | ✅ 完了 | PIN認証 + 予約一覧 + ドライバー一覧 |
| ドライバー専用画面 | ✅ 完了 | PIN認証 + GPS追跡 + ステータス更新 |
| ドライバー登録フォーム | ✅ 完了 | バックエンドAPI接続済み |
| 相乗り最適化 | ✅ 完了 | Claude AI マッチングエンジン |

---

## API エンドポイント一覧

### バックエンド（FastAPI）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/bookings` | なし | 予約作成 + 相乗りマッチング |
| GET | `/bookings/{id}` | なし | 予約・追跡情報取得 |
| PUT | `/bookings/{id}/driver-location` | なし | ドライバー位置・ステータス更新 |
| POST | `/payments/create-intent` | なし | Stripe PaymentIntent作成 |
| POST | `/drivers/register` | なし | ドライバー登録 |
| GET | `/admin/bookings` | API Key | 全予約一覧（管理者用）|
| GET | `/admin/drivers` | API Key | 全ドライバー一覧（管理者用）|
| POST | `/briefing` | なし | AIブリーフィング生成 |

---

## 料金体系

### 個人向け

| ゾーン | ソロ（1個） | ペア（〜3個） | ファミリー（〜6個） |
|--------|------------|------------|-----------------|
| 千歳・苫小牧 | ¥3,500 | ¥6,000 | ¥10,000 |
| 札幌市内 | ¥5,000 | ¥8,000 | ¥14,000 |
| 小樽 | ¥6,500 | ¥11,000 | ¥18,000 |
| 富良野・美瑛 | ¥5,500 | ¥9,000 | ¥15,000 |

割引: 相乗り2人 各-¥1,500 / 相乗り3人 各-¥2,200 / 早割48h前 -¥500 / GPS近接 -¥300

### 法人向け

| プラン | 月額 | 件数 |
|--------|------|------|
| スターター | ¥50,000 | 10件/月 |
| ビジネス | ¥120,000 | 30件/月 |
| エンタープライズ | 要相談 | 無制限 |

---

## 法的事項

- **運送資格:** 貨物軽自動車運送事業（黒ナンバー）取得済みドライバーのみ従事
- **決済:** JPYC は資金決済法上の前払式支払手段（暗号資産非該当）
- **個人情報:** 日本個人情報保護法・GDPR準拠

---

## 開業チェックリスト

```
法的手続き
□ 個人事業の開業届（税務署）
□ 貨物軽自動車運送事業 届出（運輸支局）
□ 黒ナンバー取得（軽自動車検査協会）
□ 軽貨物専用任意保険加入

システム設定
□ Stripe本番キーをRailwayに設定
□ ADMIN_PINを環境変数化（デフォルト"0000"から変更）
□ Resend kairox.jp ドメイン認証
□ JPYCウォレットアドレス設定
□ Railwayを有料プランへ移行（スリープ防止）

営業
□ ラピダス / ASML 総務へアポイント
□ KKday / Klook 掲載申請
□ 北海道エアポート（HAP）事前相談
```

---

## ライセンス

Proprietary — KAIROX All Rights Reserved.
