/**
 * POST /api/telegram/webhook
 *
 * KAIROX Bot — 受信Webhook（運行管理）
 * 登録: curl -s "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://www.kairox.jp/api/telegram/webhook"
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sendMessage, editMessage, answerCallback,
  sendOperator, sendDriver,
  sendDutyOnForm, sendDutyOffForm,
  notifyNewBooking, HELP_TEXT,
  chatIdOf,
} from "@/lib/telegram";

const API_URL     = process.env.NEXT_PUBLIC_API_URL ?? "";
const OPERATOR_ID = process.env.TELEGRAM_CHAT_ID          ?? "7002592682";
const DRIVER_ID   = process.env.TELEGRAM_DRIVER_CHAT_ID   ?? "6982319714";

// ── ドライバーGPS最終位置（メモリ。再起動でリセット） ──
let latestGps: { lat: number; lng: number; updatedAt: string } | null = null;

// ── 勤務セッション（メモリ） ──
let dutySession: { startAt: string; odometerStart?: number } | null = null;

// ─────────────────────────────────────────────
// Telegram update 型（最小限）
// ─────────────────────────────────────────────
interface TgUser    { id: number; first_name: string }
interface TgChat    { id: number }
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  location?: { latitude: number; longitude: number };
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
  const text    = msg.text?.trim() ?? "";
  const chatId  = String(msg.chat.id);
  // ── デバッグ: IDを返してから認証チェック ──
  if (text === "/id" || text === "/myid") {
    await sendMessage(chatId, `🆔 Your chat\\_id: \`${chatId}\`\nOPERATOR: \`${OPERATOR_ID}\`\nDRIVER: \`${DRIVER_ID}\``);
    return;
  }
  const isOp    = chatId === OPERATOR_ID;
  const isDrv   = chatId === DRIVER_ID || chatId === OPERATOR_ID; // 当面Tsuneが兼任
  if (!isOp && !isDrv) {
    await sendMessage(chatId, `🆔 chat\\_id: \`${chatId}\` — このIDをTsuneに伝えてください`);
    return;
  }

  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = rawCmd.split("@")[0]; // メニュー経由で /cmd@botname になる場合に対応

  switch (cmd.toLowerCase()) {
    // ── 運行管理 ──
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

    // ── レポート ──
    case "/report":
      await handleReport(chatId);
      break;

    // ── ヘルプ ──
    case "/help":
    case "/start":
      await sendMessage(chatId, HELP_TEXT);
      break;

    // ── メーター入力（数字のみのメッセージ）──
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

  if (dutySession) {
    lines.push(`🟢 勤務中（開始: ${dutySession.startAt}）`);
    if (dutySession.odometerStart !== undefined) {
      lines.push(`🚗 出庫メーター: ${dutySession.odometerStart.toLocaleString()} km`);
    }
  } else {
    lines.push(`🔴 勤務外`);
  }

  if (latestGps) {
    const mapsUrl = `https://maps.google.com/maps?q=${latestGps.lat},${latestGps.lng}`;
    lines.push(``, `📍 [現在地を地図で見る](${mapsUrl})`);
    lines.push(`🕐 GPS更新: ${latestGps.updatedAt}`);
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
    const res = await fetch(`${API_URL}/bookings?status=pending`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data: Array<{ booking_id: string; flight_number?: string; pickup_location: string; destination: string; extra_bags: number }> = await res.json();
      if (data.length === 0) {
        lines.push(`（待ち予約なし）`);
      } else {
        data.slice(0, 10).forEach((b, i) => {
          lines.push(
            ``,
            `*${i + 1}. \`${b.booking_id}\`*`,
            `✈️ ${b.flight_number ?? "便名未定"}`,
            `📍 ${b.pickup_location} → 🏨 ${b.destination}`,
            `🧳 ${(b.extra_bags ?? 0) + 1}個`,
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
  try {
    await fetch(`${API_URL}/bookings/${encodeURIComponent(bookingId)}/complete`, {
      method: "POST",
    }).catch(() => {});
  } catch {}

  await sendMessage(chatId,
    `✅ *配送完了*\nID: \`${bookingId}\`\n🕐 ${jst}`,
  );
  // オペレーターにも通知（ドライバーが完了した場合）
  if (chatId === DRIVER_ID) {
    await sendOperator(`✅ *配送完了* — \`${bookingId}\`\n🕐 ${jst}`);
  }
  // 次のキューを自動確認
  await handleQueue(chatId);
}

// ─────────────────────────────────────────────
// /report — 本日の運行サマリー
// ─────────────────────────────────────────────
async function handleReport(chatId: string) {
  const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  const lines = [`📊 *運行サマリー — ${today}*`];

  if (dutySession) {
    lines.push(`🟢 勤務中（開始: ${dutySession.startAt}）`);
  } else {
    lines.push(`🔴 本日の勤務データなし`);
  }

  try {
    const res = await fetch(`${API_URL}/api/stats/today`, { cache: "no-store" });
    if (res.ok) {
      const d: { total_bookings?: number; completed?: number; total_revenue?: number } = await res.json();
      lines.push(
        ``,
        `📦 予約: ${d.total_bookings ?? 0}件`,
        `✅ 完了: ${d.completed ?? 0}件`,
        `💴 売上: ¥${(d.total_revenue ?? 0).toLocaleString()}`,
      );
    }
  } catch {}

  await sendMessage(chatId, lines.join("\n"));
}

// ─────────────────────────────────────────────
// メーター入力（数字のみ）
// ─────────────────────────────────────────────
async function handleOdometer(chatId: string, km: number) {
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  if (dutySession && dutySession.odometerStart === undefined) {
    // 出庫メーター
    dutySession.odometerStart = km;
    await sendMessage(chatId,
      `✅ 出庫メーター記録: *${km.toLocaleString()} km*\n🕐 ${jst}\n\n📍 ライブロケーションを共有して出発してください`,
    );
    await sendOperator(`🚗 *ドライバー出庫*\nメーター: ${km.toLocaleString()} km\n🕐 ${jst}`);
  } else if (dutySession && dutySession.odometerStart !== undefined) {
    // 帰着メーター
    const driven = km - dutySession.odometerStart;
    const startAt = dutySession.startAt;
    dutySession = null;

    await sendMessage(chatId,
      [
        `✅ *勤務終了・帰着記録*`,
        `🕐 帰着: ${jst}`,
        `🚗 帰着メーター: ${km.toLocaleString()} km`,
        `📏 本日走行: ${driven.toLocaleString()} km`,
      ].join("\n"),
    );
    await sendOperator(
      [
        `🏁 *ドライバー帰着*`,
        `🕐 出庫: ${startAt}`,
        `🕐 帰着: ${jst}`,
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
  const data     = cq.data ?? "";
  const chatId   = String(cq.message?.chat.id ?? "");
  const msgId    = cq.message?.message_id ?? 0;
  const jst      = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  await answerCallback(cq.id);

  // ── 新規予約 受諾 ──
  if (data.startsWith("accept:")) {
    const bookingId = data.replace("accept:", "");
    try {
      await fetch(`${API_URL}/bookings/${encodeURIComponent(bookingId)}/accept`, {
        method: "POST",
      }).catch(() => {});
    } catch {}
    await editMessage(chatId, msgId,
      `✅ *受諾済み* — \`${bookingId}\`\n🕐 ${jst}`,
    );
    await sendDriver(
      [
        `📦 *集荷指示*`,
        `予約ID: \`${bookingId}\``,
        `🕐 ${jst}`,
        ``,
        `詳細は /queue で確認してください`,
      ].join("\n"),
      [[{ text: "📦 集荷完了", callback_data: `pickup:${bookingId}` }]],
    );
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
    dutySession = {
      startAt: jst,
    };
    await editMessage(chatId, msgId,
      `✅ *点呼完了*\n🕐 出庫: ${jst}\n\n出庫時メーター(km)を送ってください`,
    );
    await sendOperator(`🚗 *ドライバー出庫* 🕐 ${jst}`);
    return;
  }

  // ── 帰着報告完了 ──
  if (data === "duty_off_confirm") {
    await editMessage(chatId, msgId,
      `帰着時メーター(km)を送ってください`,
    );
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
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  latestGps = { lat, lng, updatedAt: jst };

  // FastAPI にGPS送信（エラーでも続行）
  if (API_URL) {
    fetch(`${API_URL}/vehicle/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, recorded_at: new Date().toISOString() }),
    }).catch(() => {});
  }
}
