import { NextResponse } from "next/server";

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json({ error: "TIKTOK_CLIENT_KEY not set" }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://kairox.jp"}/api/auth/tiktok/callback`;
  const scope = "user.info.basic,video.upload,video.publish,video.list";
  const state = Math.random().toString(36).substring(2);

  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    scope,
    response_type: "code",
    state,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
