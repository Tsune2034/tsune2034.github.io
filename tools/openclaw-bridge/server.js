/**
 * KAIROX × Telegram 通知ブリッジサーバー
 *
 * KAIROXからのイベントを Telegram Bot API で転送する。
 * OpenClaw不要 — Bot APIに直接送信。
 *
 * 起動: node server.js
 * 外部公開: ngrok http 3100
 *
 * 環境変数:
 *   TELEGRAM_BOT_TOKEN   - ボットトークン（BotFather発行）
 *   OPERATOR_CHAT_ID     - オペレーター（Tsune）のTelegram chat_id
 *   DRIVER_CHAT_ID       - ドライバーのTelegram chat_id（任意）
 *   OPENCLAW_BRIDGE_SECRET - 認証シークレット
 *   PORT                 - ポート番号（デフォルト: 3100）
 */

const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3100;
const API_SECRET = process.env.OPENCLAW_BRIDGE_SECRET || "kairox-bridge-secret";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8753704388:AAG3GR7KMFpweEv_MAIZNyeRBkbtVSbUC70";
const OPERATOR_CHAT_ID = process.env.OPERATOR_CHAT_ID || "7002592682";
const DRIVER_CHAT_ID = process.env.DRIVER_CHAT_ID || "6982319714";

/**
 * Telegram Bot API でメッセージ送信
 * @param {string} chatId  - 送信先 chat_id（数値文字列）
 * @param {string} text    - メッセージ本文
 * @returns {Promise<object>}
 */
function sendTelegram(chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve(parsed.result);
          } else {
            reject(new Error(`Telegram API error: ${parsed.description}`));
          }
        } catch {
          reject(new Error("Invalid JSON from Telegram API"));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Telegram API timeout"));
    });

    req.write(body);
    req.end();
  });
}

/**
 * "to" フィールドを chat_id に解決する
 * "operator" → OPERATOR_CHAT_ID
 * "driver"   → DRIVER_CHAT_ID
 * その他     → そのまま使う（数値文字列 chat_id を直接指定）
 */
function resolveChatId(to) {
  if (to === "operator") return OPERATOR_CHAT_ID;
  if (to === "driver") return DRIVER_CHAT_ID;
  return to;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Secret");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ヘルスチェック
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      version: "2.0.0",
      bot_configured: !!BOT_TOKEN,
      operator_configured: !!OPERATOR_CHAT_ID,
      driver_configured: !!DRIVER_CHAT_ID,
    }));
    return;
  }

  // 通知エンドポイント
  if (req.method === "POST" && req.url === "/notify") {
    const secret = req.headers["x-bridge-secret"];
    if (secret !== API_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { to, message, event } = JSON.parse(body);

        if (!to || !message) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "to と message は必須です" }));
          return;
        }

        const chatId = resolveChatId(to);
        if (!chatId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `chat_id not configured for to="${to}"` }));
          return;
        }

        console.log(`[${new Date().toISOString()}] 送信: event=${event ?? "-"} to=${to} (chat_id=${chatId})`);
        console.log(`  メッセージ: ${message}`);

        const result = await sendTelegram(chatId, message);
        console.log(`  → 完了: message_id=${result.message_id}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, message_id: result.message_id }));
      } catch (err) {
        console.error(`  → エラー: ${err.message}`);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`\n🤖 KAIROX × Telegram 通知ブリッジ v2.0`);
  console.log(`   PORT   : ${PORT}`);
  console.log(`   SECRET : ${API_SECRET}`);
  console.log(`   BOT    : ${BOT_TOKEN ? "✅ 設定済み" : "❌ 未設定"}`);
  console.log(`   OP ID  : ${OPERATOR_CHAT_ID || "❌ 未設定 → /start で確認"}`);
  console.log(`   DRV ID : ${DRIVER_CHAT_ID || "未設定"}`);
  console.log(`\n   ngrokで外部公開:`);
  console.log(`   ngrok http ${PORT}`);
  console.log(`\n   chat_id確認（ブラウザで開く）:`);
  console.log(`   https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
  console.log(`\n   テスト送信:`);
  console.log(`   curl -X POST http://localhost:${PORT}/notify \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "X-Bridge-Secret: ${API_SECRET}" \\`);
  console.log(`     -d '{"to":"operator","message":"🧪 KAIROXテスト通知","event":"test"}'`);
});
