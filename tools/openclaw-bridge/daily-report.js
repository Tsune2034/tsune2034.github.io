const http = require("http");

const today = new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });

const report = `📊 KAIROX デイリーレポート
${today}

✅ 完了タスク
・Telegram通知ブリッジ実装
　OpenClaw廃止→Bot API直接接続
　operator（役員）+ 社長 両方に通知
・NEWバッジ UTCタイムゾーン修正
　ドライバーメッセージの5分判定ズレ解消
・GCP APIキー referer制限設定
　kairox.jp / vercel.app / localhost のみ許可

🔗 本番: https://kairox.jp/narita
📦 バージョン: v0.13.0`;

const body = JSON.stringify({
  to: "driver",
  message: report,
  event: "daily_report",
});

const options = {
  hostname: "localhost",
  port: 3100,
  path: "/notify",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Bridge-Secret": "kairox-bridge-secret",
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const r = JSON.parse(data);
    if (r.ok) {
      console.log("✅ Telegramに送信完了");
    } else {
      console.error("❌ エラー:", data);
    }
  });
});

req.on("error", (e) => console.error("エラー:", e.message));
req.write(body);
req.end();
