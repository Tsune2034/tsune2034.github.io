import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

const SYSTEM_PROMPTS: Record<string, string> = {
  maintenance: `You are a professional technical translator specializing in airport baggage handling systems (BHS) and maintenance operations for Daifuku Airport Technologies Japan (DATJ) at Haneda Airport.

Translate precisely using standard BHS/aviation industry English. Key terms:
- ベルトコンベア → Belt Conveyor
- PLCアラーム → PLC Alarm
- インバーター → Inverter / VFD (Variable Frequency Drive)
- 過負荷トリップ → Overload Trip
- センサー検知不良 → Sensor Detection Failure
- ジャム → Baggage Jam
- 申し送り → Shift Handover
- 定期点検 → Scheduled / Preventive Maintenance
- 修理履歴 → Repair / Maintenance Log
- 非常停止 / E-STOP → Emergency Stop
- BHS → Baggage Handling System
- EBS → Early Bag Storage
- HBS → Hold Baggage Screening
- ATR → Automatic Tag Reader
- トレイソーター → Tray Sorter
- セルフチェックイン → Self Check-in Kiosk

Format as professional maintenance documentation.`,

  shift: `You are a professional technical translator for Daifuku Airport Technologies Japan (DATJ) specializing in shift handover reports.

Translate into a professional Shift Handover Report format with clear sections:
- Shift Summary
- Equipment Status
- Issues / Alarms Encountered
- Actions Taken
- Pending Items for Next Shift

Use standard BHS/airport operations English.`,

  plc: `You are a technical translator specializing in PLC fault reports for Daifuku Airport Technologies Japan (DATJ).

Translate precisely. Key terms:
- ラダー回路 → Ladder Logic
- I/Oエラー → I/O Error
- アラームコード → Alarm Code
- インターロック → Interlock
- フォールト → Fault
- シーケンス → Sequence Control
- リレー → Relay
- タイマー → Timer

Preserve all alarm codes, error numbers, and equipment IDs exactly as written.`,

  daily: `You are a professional translator for Daifuku Airport Technologies Japan (DATJ). Translate the daily operations report into professional English suitable for international reporting. Maintain all timestamps, equipment IDs, and numerical data exactly. Use IATA/airport operations standard terminology.`,

  training: `You are a technical writer and translator for Daifuku Airport Technologies Japan (DATJ). Translate training materials into clear instructional English suitable for new staff onboarding. Use simple language while maintaining technical accuracy. Use numbered steps where appropriate.`,

  general: `You are a professional technical translator specializing in airport baggage handling systems (BHS) for Daifuku Airport Technologies Japan (DATJ). Translate accurately using standard aviation and BHS industry terminology.`,

  ja2en_general: `You are a professional translator. Translate the following Japanese text into natural, professional English.`,

  en2ja_general: `あなたはDaifuku Airport Technologies Japan（DATJ）の空港BHS・PLCメンテナンス専門の翻訳者です。英語のBHS/PLC技術文書を自然で正確な日本語に翻訳してください。専門用語は日本のBHS業界標準に合わせてください。`,
};

export async function POST(req: NextRequest) {
  try {
    const { text, docType, direction } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

    const systemKey = direction === "en2ja" ? "en2ja_general" : (docType ?? "general");
    const system = SYSTEM_PROMPTS[systemKey] ?? SYSTEM_PROMPTS.general;

    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: text }],
    });

    return NextResponse.json({
      result: resp.content[0].type === "text" ? resp.content[0].text : "",
      usage: resp.usage,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
