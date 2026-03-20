# KAIROX 製品仕様書

**バージョン**: 1.0
**作成日**: 2026-03-19
**サービス名**: KAIROX（カイロックス）
**カテゴリ**: インバウンド向け手ぶら観光配送アプリ

---

## 1. サービス概要

訪日外国人観光客が購入した荷物・スーツケースを、観光中に手ぶらで過ごせるよう指定場所（ホテル・空港）まで当日配送するサービス。クレジットカードに加え USDC（ステーブルコイン）決済に対応し、両替不要のシームレスな旅行体験を提供する。

### ターゲットユーザー

| セグメント | 詳細 |
|---------|------|
| 主要ユーザー | 台湾・韓国・香港・欧米系インバウンド旅行者 |
| 年齢層 | 20〜50代 |
| 利用シーン | ショッピング後・観光中・ホテルチェックアウト後 |
| デバイス | スマートフォン（iOS / Android）、ブラウザ |

### 展開エリア（フェーズ別）

| フェーズ | エリア | 時期 |
|--------|------|------|
| Phase 1 | 北海道（札幌・小樽・富良野 → 新千歳空港） | 即時 |
| Phase 2 | 東京・京都・大阪 | 1年後 |
| Phase 3 | シンガポール | 2年後 |
| Phase 4 | オーストラリア・その他アジア | 3年後 |

---

## 2. 機能一覧

### 2-1. エンドユーザー向け機能

| 機能ID | 機能名 | 優先度 | フェーズ |
|-------|------|-------|--------|
| F-01 | 集荷依頼フォーム | ★★★ 必須 | MVP |
| F-02 | 配送追跡 | ★★★ 必須 | MVP |
| F-03 | AI カスタマーサポートチャット | ★★☆ 重要 | MVP |
| F-04 | クレジットカード決済 | ★★★ 必須 | MVP |
| F-05 | USDC 決済 | ★★☆ 重要 | Phase 1 |
| F-06 | 予約履歴一覧 | ★★☆ 重要 | Phase 1 |
| F-07 | 配送完了通知（メール/LINE） | ★★☆ 重要 | Phase 1 |
| F-08 | 多言語対応（EN/JA/ZH/KO） | ★★★ 必須 | MVP |
| F-09 | 料金見積もり表示 | ★★☆ 重要 | Phase 1 |

### 2-2. 管理者（ドライバー・オペレーター）向け機能

| 機能ID | 機能名 | 優先度 | フェーズ |
|-------|------|-------|--------|
| A-01 | 予約管理ダッシュボード | ★★★ 必須 | Phase 1 |
| A-02 | 配送ステータス更新 | ★★★ 必須 | Phase 1 |
| A-03 | 収益レポート | ★★☆ 重要 | Phase 2 |
| A-04 | ドライバー追加・管理 | ★☆☆ 任意 | Phase 2 |

---

## 3. 画面仕様

### 3-1. 集荷依頼フォーム（F-01）

**ステップ構成（5ステップ）**

```
Step 1: 連絡先
  - 氏名（必須）
  - メールアドレス（必須）
  - 電話番号

Step 2: 荷物情報
  - 荷物タイプ（ショッピングバッグ / スーツケース / 箱）
  - 個数（1〜10個）
  - サイズ（S: 50cm未満 / M: 50〜70cm / L: 70cm以上）

Step 3: 集荷・配送情報
  - 集荷場所（テキスト入力 / Google Maps選択）
  - 集荷日時（日時ピッカー）
  - 配送先タイプ（ホテル / 成田空港 / 羽田空港）
  - ホテル名・部屋番号（ホテル選択時）

Step 4: 支払い
  - 決済方法選択（クレジットカード / USDC）
  - カード情報入力（Stripe Elements）
  - USDCウォレットアドレス表示（USDC選択時）
  - 料金表示（¥2,000〜3,000 + 最終確定案内）

Step 5: 予約確認
  - 予約完了メッセージ
  - トラッキング番号（KRX-XXXXXX形式）
  - 「配送追跡」ボタン
  - 「新しい予約」ボタン
```

**バリデーションルール**

| フィールド | ルール |
|---------|------|
| 氏名 | 必須・2文字以上 |
| メール | 必須・RFC準拠フォーマット |
| 集荷場所 | 必須 |
| 集荷日時 | 必須・現在時刻+2時間以降 |
| ホテル名 | 配送先がホテルの場合必須 |

---

### 3-2. 配送追跡画面（F-02）

**表示要素**

```
① トラッキング番号入力フィールド
② ステータスタイムライン
   - 予約受付（Booking Confirmed）
   - 集荷完了（Picked Up）
   - 配送中（In Transit）  ← ライブアニメーション
   - 配達完了（Delivered）
③ サマリーカード
   - 集荷場所
   - 配送先
   - 予定到着時刻（ETA）
④ 最終更新時刻
```

**ステータス更新方法**
- MVP: バックエンドAPIからポーリング（30秒間隔）
- Phase 2: WebSocket リアルタイム更新

---

### 3-3. AI カスタマーサポートチャット（F-03）

**機能詳細**

```
- Claude API（claude-haiku-4-5）を使用
- フローティングチャットボタン（右下固定）
- 会話履歴: セッション中のみ保持
- 対応言語: 4言語（言語設定に連動）
- 想定Q&A:
  ・料金はいくらですか？
  ・集荷時間の変更はできますか？
  ・どのエリアに対応していますか？
  ・スーツケースのサイズ制限は？
  ・USDC決済の使い方
  ・配送が遅れている場合
```

**システムプロンプト（ベース）**
```
You are a helpful customer support agent for KAIROX,
a hands-free luggage delivery service for tourists in Japan.
Always respond in the user's language.
Be concise, friendly, and accurate.
Service area: Hokkaido (Sapporo, Otaru, Furano → New Chitose Airport).
Pricing: ¥2,000〜3,000 per item.
Payment: Credit card or USDC.
```

---

### 3-4. ナビゲーション構成

```
ヘッダー（常時表示）
├── KAIROX ブランド + タグライン
├── 言語切替ボタン（EN / 日本語 / 繁體中文 / 한국어）
└── タブナビ
    ├── Book Delivery（集荷依頼）
    └── Track（追跡）

フッター（Phase 1〜）
├── 利用規約
├── プライバシーポリシー
└── お問い合わせ
```

---

## 4. データ構造

### 4-1. 予約データ（Booking）

```typescript
interface Booking {
  id: string;                    // UUID
  tracking_number: string;       // "KRX-XXXXXX"
  status: BookingStatus;
  created_at: string;            // ISO 8601
  updated_at: string;

  // 連絡先
  customer_name: string;
  customer_email: string;
  customer_phone?: string;

  // 荷物
  luggage_type: "bag" | "suitcase" | "box";
  quantity: number;              // 1〜10
  size: "s" | "m" | "l";

  // 集荷・配送
  pickup_location: string;
  pickup_datetime: string;       // ISO 8601
  destination_type: "hotel" | "narita" | "haneda";
  hotel_name?: string;
  room_number?: string;

  // 決済
  payment_method: "credit" | "usdc";
  payment_status: "pending" | "paid" | "failed";
  amount_jpy: number;
  amount_usdc?: number;

  // 追跡
  delivery_status: DeliveryStatus;
  driver_id?: string;
  eta?: string;
}

type BookingStatus = "pending" | "confirmed" | "cancelled";
type DeliveryStatus = "booked" | "pickup" | "transit" | "delivered";
```

### 4-2. 配送ステータス更新履歴

```typescript
interface StatusHistory {
  id: string;
  booking_id: string;
  status: DeliveryStatus;
  updated_at: string;
  updated_by: string;    // driver_id or "system"
  note?: string;
  location?: string;     // GPS座標（将来）
}
```

---

## 5. 技術スタック

### フロントエンド

| 項目 | 技術 |
|-----|------|
| フレームワーク | Next.js 16（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| デプロイ | Vercel |
| 国際化 | カスタム i18n（i18n.ts） |
| 決済UI | Stripe Elements |

### バックエンド（Phase 1〜）

| 項目 | 技術 |
|-----|------|
| フレームワーク | FastAPI（Python） |
| ORM | SQLAlchemy 2.0 |
| DB | PostgreSQL（Railway） |
| AI | Anthropic claude-haiku-4-5（チャット）|
| 決済 | Stripe API + Circle USDC API |
| デプロイ | Railway |
| 認証 | API Key（管理者）/ JWT（Phase 2） |

### 外部サービス

| サービス | 用途 |
|---------|------|
| Stripe | クレジットカード決済 |
| Circle Payments API | USDC決済 |
| Google Maps API | 住所入力・地図表示（Phase 1） |
| SendGrid / Resend | メール通知 |
| LINE Messaging API | LINE通知（日本市場向け） |

---

## 6. 料金体系

| 荷物タイプ | サイズ | 基本料金 |
|---------|------|---------|
| ショッピングバッグ | S | ¥1,500 |
| ショッピングバッグ | M | ¥2,000 |
| スーツケース | S / M | ¥2,500 |
| スーツケース | L | ¥3,000 |
| 箱・パーセル | 全サイズ | ¥2,000〜3,000 |

**追加料金**
- 2個目以降: ×0.8（20%割引）
- 空港配送（成田・羽田）: +¥500
- 時間指定（1時間以内）: +¥500
- 深夜（22:00〜7:00）: +¥1,000

---

## 7. 非機能要件（概要）

| 項目 | 目標値 |
|-----|-------|
| ページ読み込み（LCP） | 2.5秒以内 |
| モバイル対応 | iPhone SE（375px）〜 |
| 可用性 | 99.5%以上 |
| 対応ブラウザ | Safari / Chrome 最新2バージョン |
| HTTPS | 必須 |
| 個人情報保護 | 日本・GDPR準拠 |

---

## 8. 将来ロードマップ

```
MVP（現在）
├── 集荷依頼フォーム ✅
├── 配送追跡 ✅
└── AI カスタマーサポート（開発中）

Phase 1（〜6ヶ月）
├── Stripe 決済統合
├── USDC 決済統合
├── バックエンドAPI接続
├── メール・LINE通知
└── 管理者ダッシュボード

Phase 2（〜1年）
├── Google Maps 住所入力
├── リアルタイム追跡（WebSocket）
├── KKday・Klook 掲載
├── 予約履歴
└── レビュー機能

Phase 3（〜2年）
├── シンガポール展開
├── ドライバーアプリ分離
└── マルチドライバー対応
```
