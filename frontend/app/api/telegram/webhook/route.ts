/**
 * POST /api/telegram/webhook
 *
 * KAIROX Bot — 受信Webhook（運行管理）
 * 登録: curl -s "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.kairox.jp/api/telegram/webhook"
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendMessage, editMessage, answerCallback,
  sendOperator,
  sendDutyOnForm, sendDutyOffForm,
  notifyNewBooking, HELP_TEXT,
} from "@/lib/telegram";

const API_URL     = process.env.NEXT_PUBLIC_API_URL ?? "";
const OPERATOR_ID = process.env.TELEGRAM_CHAT_ID          ?? "7002592682";
const DRIVER_ID   = process.env.TELEGRAM_DRIVER_CHAT_ID   ?? "6982319714";

// ─────────────────────────────────────────────
// Telegram update 型（最小限）
// ─────────────────────────────────────────────
interface TgUser    { id: number; first_name: string }
interface TgChat    { id: number }
interface TgPhotoSize { file_id: string; width: number; height: number }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  caption?: string;
  location?: { latitude: number; longitude: number };
  photo?: TgPhotoSize[];
}
interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}
interface TgUpdate {
  message?:         TgMessage;
  edited_message?:  TgMessage;
  callback_query?:  TgCallbackQuery;
}

// ─────────────────────────────────────────────
// FastAPI ヘルパー
// ─────────────────────────────────────────────
async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...opts,
    });
    return res.ok ? (res.json() as Promise<T>) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: false });
  }

  // ライブロケーション（メッセージ or 編集）
  const locMsg = update.message?.location
    ? update.message
    : update.edited_message?.location
    ? update.edited_message
    : null;

  if (locMsg?.location) {
    await handleLocation(locMsg.location.latitude, locMsg.location.longitude);
    return NextResponse.json({ ok: true });
  }

  // 写真
  if (update.message?.photo) {
    await handlePhoto(update.message);
    return NextResponse.json({ ok: true });
  }

  // コマンド
  if (update.message?.text) {
    await handleCommand(update.message);
    return NextResponse.json({ ok: true });
  }

  // ボタン
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// ─────────────────────────────────────────────
// コマンドルーター
// ─────────────────────────────────────────────
async function handleCommand(msg: TgMessage) {
  const text   = msg.text?.trim() ?? "";
  const chatId = String(msg.chat.id);

  // デバッグ: IDを返してから認証チェック
  if (text === "/id" || text === "/myid") {
    await sendMessage(chatId, `🆔 Your chat\\_id: \`${chatId}\`\nOPERATOR: \`${OPERATOR_ID}\`\nDRIVER: \`${DRIVER_ID}\``);
    return;
  }

  const isOp  = chatId === OPERATOR_ID;
  const isDrv = chatId === DRIVER_ID || chatId === OPERATOR_ID; // 当面Tsuneが兼任
  if (!isOp && !isDrv) {
    await sendMessage(chatId, `🆔 chat\\_id: \`${chatId}\` — このIDをTsuneに伝えてください`);
    return;
  }

  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.split("@")[0]; // メニュー経由で /cmd@botname になる場合に対応

  switch (cmd.toLowerCase()) {
    case "/duty_on":
      await sendDutyOnForm(chatId);
      break;

    case "/duty_off":
      await sendDutyOffForm(chatId);
      break;

    case "/status":
      await handleStatus(chatId);
      break;

    case "/queue":
      await handleQueue(chatId);
      break;

    case "/done":
      await handleDone(chatId, args[0]);
      break;

    case "/report":
      await handleReport(chatId);
      break;

    case "/detail":
      await handleDetail(chatId, args[0]);
      break;

    case "/mileage":
      await handleMileage(chatId);
      break;

    case "/flight":
      await handleFlight(chatId, args[0]);
      break;

    case "/help":
    case "/start":
      await sendMessage(chatId, HELP_TEXT);
      break;

    default:
      if (/^\d{4,6}$/.test(text)) {
        await handleOdometer(chatId, parseInt(text, 10));
      }
      break;
  }
}

// ─────────────────────────────────────────────
// /status — 現在状況
// ─────────────────────────────────────────────
async function handleStatus(chatId: string) {
  const lines = [`📊 *現在の状況*`];

  const duty = await api<{ active: boolean; start_at?: string; odometer_start?: number }>("/duty/current");
  if (duty?.active) {
    const jstStart = duty.start_at
      ? new Date(duty.start_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      : "不明";
    lines.push(`🟢 勤務中（開始: ${jstStart}）`);
    if (duty.odometer_start !== undefined && duty.odometer_start !== null) {
      lines.push(`🚗 出庫メーター: ${duty.odometer_start.toLocaleString()} km`);
    }
  } else {
    lines.push(`🔴 勤務外`);
  }

  const gps = await api<{ ok: boolean; lat?: number; lng?: number; recorded_at?: string }>("/vehicle/location");
  const GPS_STALE_MIN = 10;
  const gpsAge = gps?.recorded_at
    ? (Date.now() - new Date(gps.recorded_at + "Z").getTime()) / 60000
    : Infinity;
  if (gps?.ok && gps.lat && gps.lng && gpsAge < GPS_STALE_MIN) {
    const mapsUrl = `https://maps.google.com/maps?q=${gps.lat},${gps.lng}`;
    const jstGps = gps.recorded_at
      ? new Date(gps.recorded_at + "Z").toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      : "不明";
    lines.push(``, `📍 [現在地を地図で見る](${mapsUrl})`);
    lines.push(`🕐 GPS更新: ${jstGps}`);
  } else {
    lines.push(``, `📍 GPS: 未取得（ライブロケーションを共有してください）`);
  }

  await sendMessage(chatId, lines.join("\n"), [
    [{ text: "🔄 更新", callback_data: "refresh_status" }],
  ]);
}

// ─────────────────────────────────────────────
// /queue — 待ち予約一覧
// ─────────────────────────────────────────────
async function handleQueue(chatId: string) {
  const lines = [`📋 *待ち予約一覧*`];
  try {
    const res = await fetch(`${API_URL}/bookings?status=pending`, { cache: "no-store" });
    if (res.ok) {
      const data: Array<{ booking_id: string; flight_number?: string; pickup_location: string; destination: string; extra_bags: number }> = await res.json();
      if (data.length === 0) {
        lines.push(`（待ち予約なし）`);
      } else {
        data.slice(0, 10).forEach((b, i) => {
          const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.destination)}&travelmode=driving`;
          lines.push(
            ``,
            `*${i + 1}. \`${b.booking_id}\`*`,
            `✈️ ${b.flight_number ?? "便名未定"}`,
            `📍 ${b.pickup_location} → 🏨 ${b.destination}`,
            `🧳 ${(b.extra_bags ?? 0) + 1}個`,
            `[🗺 ナビ開始](${navUrl})`,
          );
        });
      }
    } else {
      lines.push(`（バックエンド接続エラー）`);
    }
  } catch {
    lines.push(`（取得失敗）`);
  }
  await sendMessage(chatId, lines.join("\n"));
}

// ─────────────────────────────────────────────
// /done [booking_id] — 配送完了
// ─────────────────────────────────────────────
async function handleDone(chatId: string, bookingId?: string) {
  if (!bookingId) {
    await sendMessage(chatId, `⚠️ 使い方: /done \\[予約ID\\]\n例: /done CTS\\-ABC123`);
    return;
  }
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  await api(`/bookings/${encodeURIComponent(bookingId)}/complete`, { method: "POST" });

  await sendMessage(chatId, `✅ *配送完了*\nID: \`${bookingId}\`\n🕐 ${jst}`);
  if (chatId === DRIVER_ID) {
    await sendOperator(`✅ *配送完了* — \`${bookingId}\`\n🕐 ${jst}`);
  }
  await handleQueue(chatId);
}

// ─────────────────────────────────────────────
// /report — 本日の運行サマリー
// ─────────────────────────────────────────────
async function handleReport(chatId: string) {
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const lines = [`📊 *運行サマリー — ${today}*`];

  const duty = await api<{ active: boolean; start_at?: string }>("/duty/current");
  if (duty?.active && duty.start_at) {
    const jstStart = new Date(duty.start_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    lines.push(`🟢 勤務中（開始: ${jstStart}）`);
  } else {
    lines.push(`🔴 本日の勤務データなし`);
  }

  const stats = await api<{ total_bookings?: number; completed?: number; total_revenue?: number }>("/api/stats/today");
  if (stats) {
    lines.push(
      ``,
      `📦 予約: ${stats.total_bookings ?? 0}件`,
      `✅ 完了: ${stats.completed ?? 0}件`,
      `💴 売上: ¥${(stats.total_revenue ?? 0).toLocaleString()}`,
    );
  }

  await sendMessage(chatId, lines.join("\n"));
}

// ─────────────────────────────────────────────
// /detail [ID] — 予約詳細
// ─────────────────────────────────────────────
async function handleDetail(chatId: string, bookingId?: string) {
  if (!bookingId) {
    await sendMessage(chatId, `⚠️ 使い方: /detail \\[予約ID\\]\n例: /detail CTS\\-ABC123`);
    return;
  }
  const b = await api<{
    booking_id: string; customer_name?: string; customer_phone?: string;
    flight_number?: string; pickup_location: string; destination: string;
    hotel_name?: string; extra_bags: number; total_amount: number;
    pickup_date?: string; status: string;
  }>(`/bookings/${encodeURIComponent(bookingId)}`);
  if (!b) {
    await sendMessage(chatId, `❌ 予約が見つかりません: \`${bookingId}\``);
    return;
  }
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.hotel_name ?? b.destination)}&travelmode=driving`;
  await sendMessage(chatId, [
    `📋 *予約詳細 — \`${b.booking_id}\`*`,
    `👤 ${b.customer_name ?? "未入力"}　📞 ${b.customer_phone ?? "未入力"}`,
    `✈️ ${b.flight_number ?? "便名未定"}`,
    `📅 ${b.pickup_date ?? "日時未定"}`,
    `📍 ${b.pickup_location}`,
    `🏨 ${b.hotel_name ?? b.destination}`,
    `🧳 ${(b.extra_bags ?? 0) + 1}個　💴 ¥${(b.total_amount ?? 0).toLocaleString()}`,
    `📌 ステータス: ${b.status}`,
    ``,
    `[🗺 ナビ開始](${navUrl})`,
  ].join("\n"));
}

// ─────────────────────────────────────────────
// /sales — 今日の売上
// ─────────────────────────────────────────────
async function handleSales(chatId: string) {
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const stats = await api<{ total_bookings: number; completed: number; pending: number; in_transit: number; total_revenue: number }>("/stats/today");
  if (!stats) {
    await sendMessage(chatId, `❌ データ取得失敗`);
    return;
  }
  await sendMessage(chatId, [
    `💴 *本日の売上 — ${today}*`,
    ``,
    `📦 総予約: ${stats.total_bookings}件`,
    `✅ 完了: ${stats.completed}件`,
    `🚚 配送中: ${stats.in_transit}件`,
    `⏳ 待機中: ${stats.pending}件`,
    `💰 売上合計: ¥${(stats.total_revenue).toLocaleString()}`,
  ].join("\n"));
}

// ─────────────────────────────────────────────
// /mileage — 月間走行距離
// ─────────────────────────────────────────────
async function handleMileage(chatId: string) {
  const data = await api<{ month: string; total_km: number; fuel_cost_est: number }>("/duty/mileage");
  if (!data) {
    await sendMessage(chatId, `❌ データ取得失敗`);
    return;
  }
  await sendMessage(chatId, [
    `🚗 *月間走行距離 — ${data.month}*`,
    ``,
    `📏 走行距離: ${data.total_km.toLocaleString()} km`,
    `⛽ 推定ガソリン代: ¥${data.fuel_cost_est.toLocaleString()}`,
    `　（¥15/km概算・軽バン想定）`,
  ].join("\n"));
}

// ─────────────────────────────────────────────
// /flight [便名] — フライト遅延確認
// ─────────────────────────────────────────────
async function handleFlight(chatId: string, flightNum?: string) {
  if (!flightNum) {
    await sendMessage(chatId, `⚠️ 使い方: /flight \\[便名\\]\n例: /flight NH101`);
    return;
  }
  const key = process.env.AVIATIONSTACK_API_KEY ?? "";
  if (!key) {
    await sendMessage(chatId, `⚠️ Aviationstack APIキー未設定`);
    return;
  }
  try {
    const res = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${key}&flight_iata=${encodeURIComponent(flightNum.toUpperCase())}&limit=1`,
      { cache: "no-store" },
    );
    const json = await res.json();
    const f = json?.data?.[0];
    if (!f) {
      await sendMessage(chatId, `❌ 便名 \`${flightNum}\` が見つかりません`);
      return;
    }
    const dep = f.departure;
    const arr = f.arrival;
    const delay = dep?.delay ? `⚠️ 出発遅延: ${dep.delay}分` : `✅ 定時`;
    const status = f.flight_status ?? "unknown";
    await sendMessage(chatId, [
      `✈️ *${f.flight?.iata ?? flightNum}*  ${f.airline?.name ?? ""}`,
      `📌 ステータス: ${status}  ${delay}`,
      `🛫 出発: ${dep?.airport ?? "?"} ${dep?.estimated ? new Date(dep.estimated).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : ""}`,
      `🛬 到着: ${arr?.airport ?? "?"} ${arr?.estimated ? new Date(arr.estimated).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : ""}`,
    ].join("\n"));
  } catch {
    await sendMessage(chatId, `❌ フライト情報の取得に失敗しました`);
  }
}

// ─────────────────────────────────────────────
// 写真受信 → 証跡保存
// ─────────────────────────────────────────────
async function handlePhoto(msg: TgMessage) {
  const chatId  = String(msg.chat.id);
  const caption = msg.caption?.trim() ?? "";
  const photo   = msg.photo?.[msg.photo.length - 1]; // 最大解像度
  if (!photo) return;

  // キャプションから予約ID抽出（例: CTS-ABC123 または ABC123）
  const bookingId = caption.match(/[A-Z]{2,4}-[A-Z0-9]{4,8}/i)?.[0]?.toUpperCase() ?? null;

  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
    // Telegram ファイルURL取得
    const fileRes  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${photo.file_id}`);
    const fileJson = await fileRes.json();
    const filePath = fileJson?.result?.file_path;
    if (!filePath) throw new Error("file_path not found");

    // ファイルダウンロード → base64
    const imgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const buf    = Buffer.from(await imgRes.arrayBuffer());
    const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;

    if (bookingId && API_URL) {
      await fetch(`${API_URL}/bookings/${encodeURIComponent(bookingId)}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_type: "evidence", data_url: dataUrl }),
        cache: "no-store",
      });
      await sendMessage(chatId, `📸 写真を保存しました\n予約ID: \`${bookingId}\``);
    } else {
      await sendMessage(chatId, `📸 受信しました（キャプションに予約IDを書くとDBに保存できます）\n例: \`CTS-ABC123\``);
    }
  } catch {
    await sendMessage(chatId, `⚠️ 写真の保存に失敗しました`);
  }
}

// ─────────────────────────────────────────────
// メーター入力（数字のみ）
// ─────────────────────────────────────────────
async function handleOdometer(chatId: string, km: number) {
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const result = await api<{
    ok: boolean; odometer_start?: number; odometer_end?: number; driven_km?: number; ended?: boolean; end_at?: string;
  }>("/duty/odometer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ km }),
  });

  // Railway 未デプロイ時は result=null → 出庫メーターとして扱う
  if (!result?.ok && result !== null) {
    await sendMessage(chatId, `⚠️ 勤務セッションがありません。/duty\\_on で出庫してください`);
    return;
  }

  if (!result?.ended) {
    // 出庫メーター記録
    await sendMessage(chatId,
      `✅ 出庫メーター記録: *${km.toLocaleString()} km*\n🕐 ${jst}\n\n📍 ライブロケーションを共有して出発してください`,
    );
    await sendOperator(`🚗 *ドライバー出庫*\nメーター: ${km.toLocaleString()} km\n🕐 ${jst}`);
  } else {
    // 帰着メーター記録（セッション終了）
    const driven = result.driven_km ?? 0;
    const endAt  = result.end_at
      ? new Date(result.end_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
      : jst;

    await sendMessage(chatId,
      [
        `✅ *勤務終了・帰着記録*`,
        `🕐 帰着: ${endAt}`,
        `🚗 帰着メーター: ${km.toLocaleString()} km`,
        `📏 本日走行: ${driven.toLocaleString()} km`,
      ].join("\n"),
    );
    await sendOperator(
      [
        `🏁 *ドライバー帰着*`,
        `🕐 帰着: ${endAt}`,
        `📏 走行距離: ${driven.toLocaleString()} km`,
        `🚗 帰着メーター: ${km.toLocaleString()} km`,
      ].join("\n"),
    );
  }
}

// ─────────────────────────────────────────────
// ボタンコールバック
// ─────────────────────────────────────────────
async function handleCallback(cq: TgCallbackQuery) {
  const data   = cq.data ?? "";
  const chatId = String(cq.message?.chat.id ?? "");
  const msgId  = cq.message?.message_id ?? 0;
  const jst    = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  await answerCallback(cq.id);

  // ── 新規予約 受諾 ──
  if (data.startsWith("accept:")) {
    const bookingId = data.replace("accept:", "");
    await api(`/bookings/${encodeURIComponent(bookingId)}/accept`, { method: "POST" });
    await editMessage(chatId, msgId, `✅ *受諾済み* — \`${bookingId}\`\n🕐 ${jst}`);
    return;
  }

  // ── 新規予約 対応不可 ──
  if (data.startsWith("reject:")) {
    const bookingId = data.replace("reject:", "");
    await editMessage(chatId, msgId, `❌ *対応不可* — \`${bookingId}\`\n🕐 ${jst}`);
    return;
  }

  // ── 集荷完了 ──
  if (data.startsWith("pickup:")) {
    const bookingId = data.replace("pickup:", "");
    await editMessage(chatId, msgId,
      `📦 *集荷完了* — \`${bookingId}\`\n🕐 ${jst}`,
      [[{ text: "✅ 配送完了", callback_data: `done:${bookingId}` }]],
    );
    await sendOperator(`📦 *集荷完了* — \`${bookingId}\`\n🕐 ${jst}`);
    return;
  }

  // ── 配送完了（ボタン） ──
  if (data.startsWith("done:")) {
    const bookingId = data.replace("done:", "");
    await handleDone(chatId, bookingId);
    await editMessage(chatId, msgId, `✅ *配送完了* — \`${bookingId}\`\n🕐 ${jst}`);
    return;
  }

  // ── 点呼完了・出庫 ──
  if (data === "duty_on_confirm") {
    await api<{ ok: boolean }>("/duty/start", { method: "POST" }).catch(() => null);
    // API失敗でも必ずメッセージを返す（Railway未デプロイ中も動作）
    await editMessage(chatId, msgId,
      `✅ *点呼完了*\n🕐 出庫: ${jst}\n\n出庫時メーター(km)を送ってください`,
    );
    await sendOperator(`🚗 *ドライバー出庫* 🕐 ${jst}`);
    return;
  }

  // ── 帰着報告完了 ──
  if (data === "duty_off_confirm") {
    await editMessage(chatId, msgId, `帰着時メーター(km)を送ってください`);
    return;
  }

  // ── ステータス更新 ──
  if (data === "refresh_status") {
    await handleStatus(chatId);
    return;
  }
}

// ─────────────────────────────────────────────
// ライブロケーション受信
// ─────────────────────────────────────────────
async function handleLocation(lat: number, lng: number) {
  await api("/vehicle/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
}
