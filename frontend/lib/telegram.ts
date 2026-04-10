// ─────────────────────────────────────────────
// KAIROX Telegram Bot helper
// ─────────────────────────────────────────────
const BOT_TOKEN       = process.env.TELEGRAM_BOT_TOKEN        ?? "";
const OPERATOR_CHAT   = process.env.TELEGRAM_CHAT_ID          ?? "7002592682";
const DRIVER_CHAT     = process.env.TELEGRAM_DRIVER_CHAT_ID   ?? "6982319714";
const BASE            = `https://api.telegram.org/bot${BOT_TOKEN}`;

export type InlineButton  = { text: string; callback_data: string };
export type InlineKeyboard = InlineButton[][];

async function tgPost(method: string, body: object) {
  if (!BOT_TOKEN) return null;
  const res = await fetch(`${BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res?.json().catch(() => null) ?? null;
}

export function chatIdOf(role: "operator" | "driver") {
  return role === "operator" ? OPERATOR_CHAT : DRIVER_CHAT;
}

/** テキスト送信 */
export async function sendMessage(
  chatId: string,
  text: string,
  keyboard?: InlineKeyboard,
) {
  return tgPost("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

/** メッセージ編集（ボタン押下後） */
export async function editMessage(
  chatId: string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
) {
  return tgPost("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

/** callback_query への即時応答（スピナー消し） */
export async function answerCallback(callbackQueryId: string, text?: string) {
  return tgPost("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  });
}

/** オペレーター（Tsune）に送信 */
export const sendOperator = (text: string, keyboard?: InlineKeyboard) =>
  sendMessage(OPERATOR_CHAT, text, keyboard);

/** ドライバーに送信 */
export const sendDriver = (text: string, keyboard?: InlineKeyboard) =>
  sendMessage(DRIVER_CHAT, text, keyboard);

// ─────────────────────────────────────────────
// 定型メッセージ
// ─────────────────────────────────────────────

/** 新規予約通知（オペレーターへ） */
export async function notifyNewBooking(p: {
  bookingId: string;
  flight: string;
  pickup: string;
  dest: string;
  bags: number;
  total: number;
}) {
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.dest)}&travelmode=driving`;
  const text = [
    `🆕 *新規予約*`,
    `📋 ID: \`${p.bookingId}\``,
    `✈️ 便名: *${p.flight}*`,
    `📍 集荷: ${p.pickup}`,
    `🏨 届け先: ${p.dest}`,
    `🧳 荷物: ${p.bags}個`,
    `💴 合計: ¥${p.total.toLocaleString()}`,
    ``,
    `[🗺 Googleマップでナビ開始](${navUrl})`,
  ].join("\n");

  return sendOperator(text, [
    [
      { text: "✅ 受諾",    callback_data: `accept:${p.bookingId}` },
      { text: "❌ 対応不可", callback_data: `reject:${p.bookingId}` },
    ],
  ]);
}

/** 出庫前点呼フォーム（chatId 省略時はドライバーへ） */
export async function sendDutyOnForm(chatId?: string) {
  const now = jstNow();
  const text = [
    `📋 *出庫前点呼チェック*`,
    `🕐 ${now}`,
    ``,
    `✅ 体調に問題なし`,
    `✅ アルコール 0（自己申告）`,
    `✅ タイヤ・ブレーキ・灯火類 点検済み`,
    `✅ 車両に異常なし`,
    ``,
    `🚗 出庫時メーター(km)を次のメッセージで送ってください`,
  ].join("\n");

  return sendMessage(chatId ?? DRIVER_CHAT, text, [
    [{ text: "✅ 点呼完了・出庫", callback_data: "duty_on_confirm" }],
  ]);
}

/** 帰着報告フォーム（chatId 省略時はドライバーへ） */
export async function sendDutyOffForm(chatId?: string) {
  const now = jstNow();
  const text = [
    `📋 *帰着報告*`,
    `🕐 ${now}`,
    ``,
    `🚗 帰着時メーター(km)を次のメッセージで送ってください`,
  ].join("\n");

  return sendMessage(chatId ?? DRIVER_CHAT, text, [
    [{ text: "✅ 帰着報告完了", callback_data: "duty_off_confirm" }],
  ]);
}

/** コマンド一覧 */
export const HELP_TEXT = [
  `📖 *KAIROX Bot コマンド一覧*`,
  ``,
  `*── 運行管理 ──*`,
  `/duty\\_on  　出庫前点呼チェック`,
  `/duty\\_off 　帰着報告`,
  `/status    　現在の状況（位置・積載）`,
  `/queue     　待ち予約一覧`,
  `/done \\[ID\\]  配送完了マーク`,
  ``,
  `*── レポート ──*`,
  `/report    　本日の運行サマリー`,
  `/help      　このコマンド一覧`,
].join("\n");

// ─── util ───
function jstNow() {
  return new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}
