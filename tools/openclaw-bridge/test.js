const http = require("http");

const body = JSON.stringify({
  to: "driver",
  message: "KAIROXテスト通知",
  event: "test",
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
  res.on("end", () => console.log("結果:", data));
});

req.on("error", (e) => console.error("エラー:", e.message));
req.write(body);
req.end();
