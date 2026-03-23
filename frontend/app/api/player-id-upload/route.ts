import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const playerId = formData.get("player_id");
    const docType  = formData.get("doc_type");
    const file     = formData.get("file");

    if (!playerId || !docType || !file) {
      return NextResponse.json({ error: "player_id, doc_type, file required" }, { status: 400 });
    }

    // バックエンドに multipart/form-data をそのまま転送
    const backendForm = new FormData();
    backendForm.append("file", file as Blob);

    const res = await fetch(
      `${BACKEND}/players/${playerId}/upload-id?doc_type=${encodeURIComponent(String(docType))}`,
      { method: "POST", body: backendForm }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
