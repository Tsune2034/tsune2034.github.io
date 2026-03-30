# KAIROX Narita — アプリ設計仕様書

**バージョン:** 1.0
**作成日:** 2026-03-23
**対象URL:** https://frontend-psi-seven-15.vercel.app/narita

---

## 1. プロダクト概要

### コンセプト
**「荷物がドライバーを探す」** — 旅行者が荷物をどこかに持ち込むのではなく、ドライバーが旅行者のいる場所に来る。成田空港発・東京都市圏配送に特化したスマートフォンファースト予約 UI。

### ターゲットユーザー
- 成田空港に到着したインバウンド旅行者（一人旅・カップル・ファミリー）
- キャリーケース・大型荷物を都内ホテル・羽田空港へ送りたい旅行者
- 空港のカウンター型配送サービスが煩雑に感じるユーザー

### 差別化ポイント
- カウンター不要・〆切なし
- GPS で現在地を自動検出 → ドライバーがそこへ来る
- クレジットカード・JPYC・USDC の3択決済
- AI確認メッセージ + LINE通知（ドライバー・オペレーター）
- 4言語完全対応（EN / JA / ZH / KO）

---

## 2. システム構成

| レイヤー | 技術 | URL |
|--------|------|-----|
| フロントエンド | Next.js 16 (App Router, Turbopack) | Vercel |
| バックエンド | FastAPI + SQLAlchemy (PostgreSQL) | Railway |
| AI（確認文・チャット） | Claude haiku-4-5-20251001 | Anthropic API |
| 通知 | LINE Notify | on booking |
| メール | Resend | on booking |
| 地図 | Google Maps Embed API（任意） | 埋め込み |

### フロントエンド ページ構成
```
/narita             — メイン予約フロー（本仕様書の対象）
/narita/status/[id] — リアルタイム追跡ページ
/driver/approve/[id]— ドライバー承認ページ（管理者向け）
```

---

## 3. 予約フロー（5ステップ）

```
Step 1: pickup    → 集荷場所の指定
Step 2: destination → 配達先の選択
Step 3: luggage   → 荷物数・決済方法の選択 + 注文サマリー確認
Step 4: confirm   → 氏名・連絡先入力 + 最終確認 → 予約送信
Step 5: matching  → AIマッチング中 → ドライバー確定
Step 6: live      → リアルタイム追跡（ドライバー位置・QR表示）
```

### Step 1: 集荷場所 (pickup)

**GPS検出**
- `navigator.geolocation.getCurrentPosition()` でGPS座標を取得
- 取得成功: 地図埋め込み表示 + 座標をpickup_locationとして利用
- 取得失敗: ターミナル選択UIへフォールバック

**ターミナル選択**（GPS代替 or 補完）

| ターミナル | 対応航空会社 | スポット数 |
|-----------|------------|---------|
| T1（第1） | JAL / Korean Air / Air China | 5か所 |
| T2（第2） | ANA / United / Lufthansa | 5か所 |
| T3（第3・LCC） | Peach / Jetstar / Spring | 4か所 |

**スポット例（T1）**
- 到着ロビー（中央）
- スターバックス（B1南）
- セブンイレブン（1F南ウイング）
- バス乗り場（1F出口）
- タクシー乗り場（1F 2番出口）

**フリーテキスト入力**（ターミナル以外の場所に対応）

### Step 2: 配達先 (destination)

| ID | 配達先（JA） | 距離 | 目安時間 | 料金 |
|----|------------|------|---------|------|
| ginza | 銀座・東京駅 | 63km | 70分 | ¥5,700 |
| shinjuku | 新宿・渋谷 | 68km | 75分 | ¥6,200 |
| asakusa | 浅草・上野 | 58km | 65分 | ¥5,200 |
| akihabara | 秋葉原・神田 | 60km | 68分 | ¥5,400 |
| yokohama | 横浜 | 90km | 100分 | ¥7,800 |
| saitama | さいたま・川越 | 80km | 90分 | ¥7,300 |
| chiba | 千葉市内 | 35km | 45分 | ¥3,700 |
| haneda1 | 羽田空港 T1 (JAL) | 90km | 95分 | ¥7,800 |
| haneda2 | 羽田空港 T2 (ANA) | 90km | 95分 | ¥7,800 |
| haneda3 | 羽田空港 T3 (国際線) | 91km | 97分 | ¥7,800 |

### Step 3: 荷物・決済 (luggage)

**荷物数:** 1〜10個（追加1個あたり EXTRA_BAG 円加算）

**決済方法:**

| 方法 | 手数料 | 備考 |
|------|--------|------|
| クレジットカード | 標準料金 | 追加手数料なし |
| JPYC (Polygon) | −5% | 1 JPYC = ¥1 固定 |
| USDC (Solana) | −5% | 暗号資産 |

**注文サマリー（リアルタイム計算）**
```
基本料金（配達先別）
+ 追加荷物料金（× 個数 − 1）
− クリプト割引（JPYC/USDC 選択時 5%）
= 合計（税込）
```

### Step 4: 確認・予約送信 (confirm)

**入力フィールド**
- お名前（必須）
- 電話 / WhatsApp（任意）

**送信データ（POST /bookings）**
```json
{
  "name": "string",
  "email": "",
  "phone": "string",
  "locale": "ja | en | zh | ko",
  "plan": "solo",
  "extra_bags": 0,
  "pickup_location": "string",
  "destination": "string",
  "zone": "narita",
  "hotel_name": "string",
  "pay_method": "credit | jpyc | usdc",
  "total_amount": 6200
}
```

**送信後の処理（バックエンド）**
1. 予約ID（KRX-XXXXXX）生成・DB保存
2. AI相乗りマッチング実行
3. Claude haiku による確認メッセージ生成（顧客言語）
4. LINE Notify でオペレーター通知
5. Resend で確認メール送信

### Step 5: マッチング (matching)

- レーダーアニメーション表示（3.5秒）
- AI ルートプラン表示：
  - Segment 1: ドライバー現在地 → 集荷場所（推定 3〜8分）
  - Segment 2: 集荷場所 → 配達先（実距離・時間）
- マッチ完了後「追跡へ進む」ボタン表示

### Step 6: ライブ追跡 (live)

- 予約ID・QRコード表示（ドライバーに提示用）
- Google Maps 埋め込み（集荷場所 → 配達先ルート）
- ドライバーナビ起動リンク（スマホ Google Maps アプリ直接起動）
- `/narita/status/[id]` への追跡リンク

---

## 4. 追跡ページ仕様（/narita/status/[id]）

**ポーリング間隔:** 30秒

**ステータス定義:**

| status | 表示（JA） | アイコン | 色 |
|--------|-----------|---------|-----|
| confirmed | 予約確定 | ✅ | 緑 |
| pickup | ドライバー向かい中 | 🚐 | 琥珀 |
| transit | 配達中 | 📦 | 青 |
| delivered | 配達完了 | 🎉 | 緑 |
| cancelled | キャンセル済み | ❌ | 赤 |

**ドライバーステータス → 予約ステータスの自動連動（バックエンド）:**
```
heading  → pickup
nearby   → transit
arrived  → transit
done     → delivered
```

---

## 5. AIチャットサポート

- モデル: Claude haiku-4-5-20251001
- エンドポイント: `/api/chat`（Next.js プロキシ経由）
- フローティングボタン（画面右下固定）
- システムプロンプト: Kairox の料金・スポット・予約方法に特化

---

## 6. 多言語対応

| 言語 | コード | 対象ユーザー |
|------|--------|------------|
| English | en | 欧米・東南アジア系旅行者 |
| 日本語 | ja | 国内旅行者・在日外国人 |
| 繁體中文 | zh | 台湾・香港・中国旅行者 |
| 한국어 | ko | 韓国旅行者 |

---

## 7. 環境変数

| 変数名 | 用途 | 必須 |
|--------|------|------|
| NEXT_PUBLIC_API_URL | Railway バックエンドURL | 必須 |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Google Maps Embed | 任意（なしでも動作） |
| ANTHROPIC_API_KEY | Claude API（バックエンド） | 必須 |
| LINE_NOTIFY_TOKEN | LINE通知 | 任意 |
| RESEND_API_KEY | メール送信 | 任意 |
| DATABASE_URL | PostgreSQL接続 | 必須（バックエンド） |

---

## 8. 営業時間制御

```typescript
const SERVICE_OPEN_HOUR  = 10;  // 10:00
const SERVICE_CLOSE_HOUR = 20;  // 20:00
const isOpen = nowHour >= SERVICE_OPEN_HOUR && nowHour < SERVICE_CLOSE_HOUR;
```

- 営業時間外: バナー表示 + 予約ボタン無効化
- チャットは営業時間外でも利用可能
- **現在: テスト用に無効化中**（`/* || !isOpen */`）

---

## 9. 既知の制限・Phase 2 予定

| 項目 | 現状 | Phase 2 |
|------|------|---------|
| AIルートプラン | シミュレーション値 | Google Directions API 接続 |
| マッチング | AI相乗りマッチング（バックエンド） | リアルタイムドライバー位置連動 |
| 追跡地図 | Google Maps Embed（静的） | ドライバーGPS リアルタイム表示 |
| 相乗り | バックエンドでグルーピング | フロント表示・割引反映 |
| Stripe 決済 | テストモード | 本番キー設定 |
| JPYC/USDC | UI表示のみ | ウォレット実連携 |
| 営業時間 | テスト用無効化中 | 本番で有効化 |
