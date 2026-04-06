import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

// Claude Batch API — 非リアルタイム処理（コスト50%削減）
// 用途: 多言語翻訳・月次レポート・FAQ生成など
// POST /api/batch
// Body: { requests: [{ id: string, prompt: string, system?: string }] }
// GET  /api/batch?batch_id=xxx → ステータス確認

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  try {
    const { requests } = await req.json() as {
      requests: { id: string; prompt: string; system?: string }[];
    };

    if (!Array.isArray(requests) || requests.length === 0) {
      return NextResponse.json({ error: "requests[] required" }, { status: 400 });
    }

    const batch = await client.messages.batches.create({
      requests: requests.map((r) => ({
        custom_id: r.id,
        params: {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          ...(r.system ? { system: r.system } : {}),
          messages: [{ role: "user" as const, content: r.prompt }],
        },
      })),
    });

    return NextResponse.json({
      batch_id: batch.id,
      status: batch.processing_status,
      request_counts: batch.request_counts,
    });
  } catch (err) {
    console.error("[batch API]", err);
    return NextResponse.json({ error: "Batch creation failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batch_id");
  if (!batchId) return NextResponse.json({ error: "batch_id required" }, { status: 400 });

  try {
    const batch = await client.messages.batches.retrieve(batchId);

    if (batch.processing_status !== "ended") {
      return NextResponse.json({
        batch_id: batch.id,
        status: batch.processing_status,
        request_counts: batch.request_counts,
      });
    }

    // 完了済み → 結果を返す
    const results: { id: string; text: string; error?: string }[] = [];
    for await (const result of await client.messages.batches.results(batchId)) {
      if (result.result.type === "succeeded") {
        const text = result.result.message.content
          .filter((c) => c.type === "text")
          .map((c) => (c as { type: "text"; text: string }).text)
          .join("");
        results.push({ id: result.custom_id, text });
      } else {
        results.push({ id: result.custom_id, text: "", error: result.result.type });
      }
    }

    return NextResponse.json({ batch_id: batchId, status: "ended", results });
  } catch (err) {
    console.error("[batch GET]", err);
    return NextResponse.json({ error: "Batch fetch failed" }, { status: 500 });
  }
}
