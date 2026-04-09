import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

// ─── Rate limiter: 20 requests per IP per minute ───
const rlMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rlMap.get(ip);
  if (!rec || now > rec.reset) { rlMap.set(ip, { count: 1, reset: now + 60_000 }); return true; }
  if (rec.count >= 20) return false;
  rec.count++;
  return true;
}

const SYSTEM_PROMPT = `You are a helpful customer support agent for KAIROX, a hands-free luggage delivery service for tourists in Japan.

Always respond in the same language the user writes in (English, Japanese, Simplified Chinese, or Korean).
Be concise, friendly, and accurate. Keep responses under 4 sentences when possible.

== NARITA SERVICE (current beta) ==
- Pickup: Narita Airport Terminal 1, 2, or 3 — user selects exact spot (Arrivals Hall, Starbucks, 7-Eleven, Bus Terminal, Taxi Stand, etc.)
- Destinations: Ginza/Tokyo Sta. ¥5,500 · Shinjuku/Shibuya ¥6,000 · Asakusa/Ueno ¥5,000 · Akihabara ¥5,200 · Yokohama ¥7,500 · Saitama ¥7,000 · Chiba ¥3,500 · Haneda Airport ¥7,500
- Extra bag: +¥1,500 per piece beyond the first
- Payment: Credit card (+10% fee) / JPYC stablecoin (−5% discount) / USDC stablecoin (−5% discount)
- How it works: GPS-based on-demand pickup — driver comes to your location, no counter, no cut-off time
- Driver arrives in ~5–10 min after matching. Luggage delivered before you arrive by train.
- 24h service. Late-night and delayed flights fully supported.

== HOKKAIDO SERVICE (coming soon) ==
- Service area: New Chitose Airport, Sapporo, Otaru (Phase 2)
- Pricing: from ¥3,500 (Chitose zone)

== GENERAL ==
- Cancel policy: Full refund within 10 min of booking. 90% refund after 10 min. No refund after pickup.
- Tracking: Booking ID shown after match (format: NRT-XXXXXX)
- No app download needed — fully web-based

If asked about something outside KAIROX service, politely say you can only help with luggage delivery questions.`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // Limit history to last 10 messages to control token usage
    const trimmed = messages.slice(-10);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
      messages: trimmed,
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 });
  }
}
