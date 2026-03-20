# KAIROX システム設計図

**バージョン:** 1.0
**作成日:** 2026-03-20
**対象:** v0.7.0 時点のシステム全体構成

---

## 1. システム全体アーキテクチャ

```
┌────────────────────────────────────────────────────────────────┐
│                        クライアント                              │
│  スマートフォン（Safari / Chrome）/ デスクトップブラウザ            │
└───────────────────────┬────────────────────────────────────────┘
                        │ HTTPS
                        ▼
┌────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 Next.js 16 App Router                    │  │
│  │                                                          │  │
│  │  ページ（静的ビルド）                                       │  │
│  │  └── / (page.tsx)                                        │  │
│  │       └── Dashboard.tsx     メインUI                     │  │
│  │       └── TrackingView.tsx  配送追跡                     │  │
│  │       └── BusinessView.tsx  法人向けページ                │  │
│  │       └── AdminView.tsx     管理者ダッシュボード           │  │
│  │       └── ChatWidget.tsx    AIチャット                   │  │
│  │                                                          │  │
│  │  APIルート（サーバーサイド・プロキシ）                        │  │
│  │  ├── /api/booking         → FastAPI /bookings           │  │
│  │  ├── /api/chat            → Anthropic API               │  │
│  │  ├── /api/payment         → Stripe API                  │  │
│  │  ├── /api/driver-register → FastAPI /drivers/register   │  │
│  │  └── /api/admin           → FastAPI /admin/* (API Key)  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ REST API            │ Stripe API         │ Anthropic API
         ▼                    ▼                    ▼
┌─────────────────┐  ┌───────────────┐  ┌────────────────────┐
│   Railway Cloud │  │  Stripe       │  │  Anthropic         │
│                 │  │  - Payment    │  │  claude-haiku-4-5  │
│  ┌───────────┐  │  │    Intent     │  │  - AIチャット       │
│  │ FastAPI   │  │  │  - Card       │  │  - 相乗りマッチング │
│  │           │  │  │    Confirm    │  │  - ルート最適化     │
│  │ POST /bookings  └───────────────┘  └────────────────────┘
│  │ GET  /bookings/{id}
│  │ PUT  /bookings/{id}/driver-location
│  │ POST /payments/create-intent
│  │ POST /drivers/register
│  │ GET  /admin/bookings
│  │ GET  /admin/drivers
│  │ POST /briefing
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │PostgreSQL │  │
│  │           │  │
│  │ bookings  │  │
│  │ driver_   │  │
│  │  registra │  │
│  │  tions    │  │
│  └───────────┘  │
└─────────────────┘
         │
         ▼
┌────────────────────────────────┐
│      外部サービス               │
│  ├── Resend（メール通知）        │
│  ├── JPYC on Polygon           │
│  └── USDC on Solana            │
└────────────────────────────────┘
```

---

## 2. フロントエンド設計

### 2-1. 状態管理

状態管理にはReactの `useState` / `useCallback` / `useEffect` のみを使用（外部ライブラリ不使用）。

```typescript
// Dashboard.tsx の主要状態
type View = "book" | "track" | "business" | "admin";

const [view, setView] = useState<View>("book");
const [locale, setLocale] = useState<Locale>("ja");
const [step, setStep] = useState(1);                     // 予約ステップ (1-5)
const [zone, setZone] = useState<Zone>("chitose");        // 配送ゾーン
const [lugType, setLugType] = useState<LugType>("bag");  // 荷物タイプ
const [qty, setQty] = useState(1);                       // 荷物個数
const [carpool, setCarpool] = useState(true);            // 相乗り希望
const [payMethod, setPayMethod] = useState<PayMethod>("credit");
const [trackingNumber, setTrackingNumber] = useState(""); // 発行済み追跡番号
```

### 2-2. 多言語システム

```typescript
// i18n.ts の構造
type Locale = "en" | "ja" | "zh" | "ko";
type Translation = { [key: string]: string };

const translations: Record<Locale, Translation> = {
  en: { nav_book: "Book", nav_track: "Track", ... },
  ja: { nav_book: "配送依頼", nav_track: "配送追跡", ... },
  zh: { nav_book: "預約配送", nav_track: "追蹤配送", ... },
  ko: { nav_book: "배송 의뢰", nav_track: "배송 추적", ... },
};
```

スポット・フライトスロットは `tr` を引数に取る関数で定義:

```typescript
function getPickupSpots(tr: Translation): Spot[]
function getHotelDeliverySpots(tr: Translation): Spot[]
function getAirportDeliverySpots(tr: Translation): Spot[]
function getFlightSlots(tr: Translation): FlightSlot[]
```

### 2-3. 料金計算ロジック

```typescript
function calcTotal(zone, planKey, qty, carpool, hasNearbyDriver, payMethod): number {
  const base = PRICES[zone][planKey];             // 基本料金
  const express = selectedSlot ? 1000 : 0;        // 急行保証料
  const extra = qty > planMax ? (qty - planMax) * 1500 : 0;  // 追加個数
  const carpoolDisc = carpool ? -carpoolDiscount : 0;         // 相乗り割引
  const gpsDisc = hasNearbyDriver ? -300 : 0;                 // GPS近接割引
  const surcharge = payMethod === "credit" ? subtotal * 0.10 : 0;  // カード手数料
  return base + express + extra + carpoolDisc + gpsDisc + surcharge;
}
```

---

## 3. バックエンド設計

### 3-1. データモデル

```python
# BookingRecord（SQLAlchemy）
class BookingRecord(Base):
    __tablename__ = "bookings"
    id              = Column(String, primary_key=True)    # UUID
    booking_id      = Column(String, unique=True)         # KRX-XXXXXX
    status          = Column(String, default="confirmed") # confirmed/pickup/transit/delivered
    name            = Column(String)
    email           = Column(String)
    phone           = Column(String, nullable=True)
    zone            = Column(String)   # chitose/sapporo/otaru/furano
    plan            = Column(String)   # solo/pair/family
    qty             = Column(Integer)
    pickup_location = Column(String)
    pickup_slot     = Column(String)
    destination     = Column(String)   # hotel/new_chitose
    hotel_name      = Column(String, nullable=True)
    total_amount    = Column(Integer)
    pay_method      = Column(String)   # credit/jpyc/usdc
    carpool         = Column(Boolean)
    match_group_id  = Column(String, nullable=True)
    driver_lat      = Column(Float, nullable=True)
    driver_lng      = Column(Float, nullable=True)
    driver_status   = Column(String, nullable=True)
    driver_updated_at = Column(String, nullable=True)
    created_at      = Column(String)

# DriverRegistrationRecord（SQLAlchemy）
class DriverRegistrationRecord(Base):
    __tablename__ = "driver_registrations"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String)
    phone      = Column(String)
    vehicle    = Column(String)   # van/truck/bike
    area       = Column(String)   # 対応エリア
    style      = Column(String)   # full/side（専業/副業）
    created_at = Column(String)
```

### 3-2. 相乗りマッチングエンジン

```
予約作成フロー:
  1. POST /bookings でリクエスト受信
  2. BookingRecord をDBに保存（status=confirmed）
  3. carpool=true の場合、マッチング処理を起動
  4. matching.py:
     - 同スロット × 同ゾーン × carpool=true × 未マッチング の予約を検索
     - 2〜3件まとめてグループ化
     - Claude haiku に最適集荷順とETA（分）を問い合わせ
     - 失敗時はデフォルト順にフォールバック
  5. グループ成立時: match_group_id を各予約に設定
  6. フロントエンドにマッチ結果を返す
```

### 3-3. ドライバーGPS追跡フロー

```
ドライバーアプリ（DriverView）:
  1. PIN認証（4桁）
  2. 追跡番号を入力
  3. GPS追跡ON → navigator.geolocation.watchPosition
  4. 30秒ごと / ステータス変更時に PUT /bookings/{id}/driver-location を送信
     { lat, lng, driver_status: "heading"|"nearby"|"pickup"|"delivered" }
  5. バックエンドが driver_status に応じて booking.status も更新
     heading  → transit
     nearby   → transit
     pickup   → pickup
     delivered → delivered

顧客追跡画面（TrackingView）:
  1. GET /bookings/{id} を10秒ごとにポーリング
  2. driver_lat / driver_lng があれば距離（haversine）と ETA を計算
  3. 配送進捗バーを更新（集荷地点→配送先）
```

---

## 4. APIエンドポイント詳細

### POST /bookings

```json
// リクエスト
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "phone": "+81-90-1234-5678",
  "zone": "chitose",
  "plan": "solo",
  "qty": 1,
  "pickup_location": "新千歳国際線到着ロビー(1F)",
  "pickup_slot": "slot_1",
  "destination": "hotel",
  "hotel_name": "ルートイン千歳",
  "total_amount": 3500,
  "pay_method": "credit",
  "carpool": true,
  "stripe_payment_intent_id": "pi_xxx"
}

// レスポンス
{
  "booking_id": "KRX-A1B2C3",
  "match_count": 2,
  "eta_minutes": 45,
  "match_reason": "同スロット・同ゾーンの2名をグループ化。集荷順：山田→Lee→Wang"
}
```

### PUT /bookings/{id}/driver-location

```json
// リクエスト
{
  "lat": 42.7753,
  "lng": 141.6922,
  "driver_status": "nearby"
}
```

---

## 5. セキュリティ設計

| レイヤー | 対策 |
|---------|------|
| フロントエンド | APIキーはサーバーサイドAPIルートのみに保持。クライアントに露出しない |
| バックエンド（管理者API）| `X-API-Key` ヘッダー認証。`require_api_key` FastAPI依存関係 |
| 管理者画面 | PIN認証（環境変数 `ADMIN_PIN`。本番前にデフォルト値から変更必須）|
| ドライバー画面 | PIN認証（4桁）|
| 決済 | Stripe Elements使用（カード情報はKAIROXサーバーを通過しない）|
| 通信 | Vercel / Railway 両方でHTTPS必須 |
| DB | Railway 内部ネットワーク。外部直接アクセス不可 |

---

## 6. 非機能設計

### パフォーマンス

| 指標 | 目標 | 現状 |
|------|------|------|
| LCP（初回表示） | 2.5秒以内 | Vercel CDNで達成済み |
| TTI（操作可能まで） | 3秒以内 | 静的ビルドで達成済み |
| APIレスポンス（予約作成） | 3秒以内 | マッチング込みで2〜5秒 |
| AIチャット応答 | 10秒以内 | Claude haiku で3〜6秒 |

### 可用性

```
Vercel（フロントエンド）: SLA 99.99%
Railway（バックエンド）:  有料プラン必須（無料はスリープあり）
PostgreSQL（Railway）:   自動バックアップ（有料プラン）
```

### スケーラビリティ想定

| ドライバー数 | アーキテクチャ | 状態 |
|------------|-------------|------|
| 1名（ソロ） | 現構成 | 対応済み |
| 2〜5名 | 現構成 + /drivers/active API | Phase 1 |
| 6名以上 | ドライバーアプリ分離 + WebSocket | Phase 2 |
| 10名以上 | Redis キュー + 複数Railwayインスタンス | Phase 3 |

---

## 7. フェーズ別ロードマップ（技術）

```
MVP（v0.7.0 現在）✅
├── Next.js 16 App Router + Vercel
├── FastAPI + PostgreSQL + Railway
├── Claude haiku AIチャット + 相乗りマッチング
├── Stripe（テストモード）+ JPYC UI + USDC UI
├── ドライバーGPS追跡（PUT /driver-location）
├── 管理者ダッシュボード（PIN認証）
└── 4言語対応 全画面

Phase 1（〜6ヶ月後）
├── Stripe本番キー設定
├── Resendドメイン認証 → 顧客メール送信
├── GET /drivers/active（GPS近接テロップの実連動）
├── ADMIN_PIN環境変数化
└── Railway有料プラン（スリープ防止）

Phase 2（〜1年後）
├── WebSocket リアルタイム追跡（FastAPI + Socket.io）
├── Google Maps Directions API（住所入力・ルート最適化）
├── ドライバーアプリ分離（専用URL or PWA）
├── 予約履歴・顧客アカウント（JWT認証）
└── Redis（Railway）セッション・マッチングキュー

Phase 3（〜2年後）
├── 東京展開（羽田・成田エリア追加）
├── シンガポール対応（通貨・言語追加）
└── マルチリージョンデプロイ
```

---

## 8. 開発環境

| ツール | バージョン |
|--------|----------|
| Node.js | 20.x LTS |
| npm | 10.x |
| Python | 3.13 |
| Next.js | 16.1.6 |
| FastAPI | 0.115.x |
| SQLAlchemy | 2.0.x |
| Tailwind CSS | v4 |
| TypeScript | 5.x |
| Vercel CLI | 50.x |
