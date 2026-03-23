import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

// ─── Agent 定義 ───────────────────────────────────────────────
const AGENTS = {
  ceo: {
    model: "claude-sonnet-4-6",
    system: `You are the CEO of KAIROX, a hands-free luggage delivery service for tourists in Japan.
Your job is to analyze user input and create an execution plan.

Respond ONLY with valid JSON in this exact format:
{
  "intent": "一言で意図を説明",
  "steps": [
    { "role": "engineer|writer|researcher|support|strategy", "task": "具体的な指示" }
  ]
}

Role selection rules:
- engineer: technical issues, code, deployment, API, bugs
- writer: copy, translation, UI text, messaging (4 languages: EN/JA/ZH/KO)
- researcher: market analysis, competitor research, user insights
- support: customer-facing answers about pricing, pickup, delivery
- strategy: business decisions, pricing, expansion, growth

Keep steps to 1-2. Do not chain more than 2 agents.`,
  },

  engineer: {
    model: "claude-sonnet-4-6",
    system: `You are the Engineer at KAIROX (Next.js 16 + FastAPI + Vercel).
Stack: TypeScript, Tailwind CSS, Stripe, Resend, Aviationstack API.
Key file: app/narita/page.tsx (4-language TR object, booking flow).
Answer technically, concisely. Include code snippets when useful.`,
  },

  writer: {
    model: "claude-haiku-4-5-20251001",
    system: `You are the Writer at KAIROX. You handle copy and translations.
Brand voice: confident, minimal, speed-focused. No fluff.
Always output all 4 languages: EN / JA / ZH(简体) / KO.
EN: imperative, short sentences.
JA: 体言止め、丁寧語禁止.
ZH: 动词先行、简体字.
KO: 해요体.`,
  },

  researcher: {
    model: "claude-haiku-4-5-20251001",
    system: `You are the Researcher at KAIROX.
Focus: inbound tourism to Japan, luggage delivery market, competitor analysis.
Be data-driven. Cite reasoning. Keep output structured with headers.`,
  },

  support: {
    model: "claude-haiku-4-5-20251001",
    system: `You are a KAIROX customer support agent.
Service: hands-free luggage delivery from Narita Airport to hotels across Tokyo/Yokohama.
Pricing: Ginza ¥5,500 / Shinjuku ¥6,000 / Asakusa ¥5,000 / Yokohama ¥7,500 / Haneda ¥12,000.
Extra bag: +¥1,500. Payment: credit card / JPYC / USDC (−5%).
Reply in the same language as the user. Be concise (under 4 sentences).`,
  },

  strategy: {
    model: "claude-sonnet-4-6",
    system: `You are the Strategy advisor at KAIROX.
Current status: beta at Narita Airport. 11 features shipped. Break-even at 6 bookings/month.
Revenue model: 15% take rate. Target: 2,000 bookings/month = ¥1.8M revenue.
Give structured strategic advice. Consider market timing (weak yen = inbound tourism boom).`,
  },
} as const;

type Role = keyof typeof AGENTS;

// ─── 単一エージェント実行 ─────────────────────────────────────
async function runAgent(role: Role, task: string): Promise<string> {
  const cfg = AGENTS[role];
  const res = await client.messages.create({
    model: cfg.model,
    max_tokens: 1024,
    system: cfg.system,
    messages: [{ role: "user", content: task }],
  });
  return res.content[0].type === "text" ? res.content[0].text : "";
}

// ─── Company.runTask ──────────────────────────────────────────
async function runTask(input: string): Promise<{
  intent: string;
  results: { role: Role; task: string; output: string }[];
}> {
  // 1. CEO が意図を分析してプランを作成
  const planRaw = await runAgent("ceo", input);

  let plan: { intent: string; steps: { role: Role; task: string }[] };
  try {
    const jsonMatch = planRaw.match(/\{[\s\S]*\}/);
    plan = JSON.parse(jsonMatch?.[0] ?? planRaw);
  } catch {
    // CEO の出力が JSON でない場合は support にフォールバック
    plan = { intent: input, steps: [{ role: "support", task: input }] };
  }

  // 2. 各エージェントを順次実行
  const results: { role: Role; task: string; output: string }[] = [];
  for (const step of plan.steps.slice(0, 2)) {
    const role = (AGENTS[step.role as Role] ? step.role : "support") as Role;
    const output = await runAgent(role, step.task);
    results.push({ role, task: step.task, output });
  }

  return { intent: plan.intent, results };
}

// ─── Rate limiter ─────────────────────────────────────────────
const rlMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rlMap.get(ip);
  if (!rec || now > rec.reset) { rlMap.set(ip, { count: 1, reset: now + 60_000 }); return true; }
  if (rec.count >= 10) return false;
  rec.count++;
  return true;
}

// ─── API ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "input required" }, { status: 400 });
    }

    const result = await runTask(input);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Company API error:", err);
    return NextResponse.json({ error: "Company unavailable" }, { status: 500 });
  }
}
