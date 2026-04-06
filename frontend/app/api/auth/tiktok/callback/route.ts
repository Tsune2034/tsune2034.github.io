import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://kairox.jp";
    return NextResponse.redirect(`${base}/tiktok-studio?error=${error ?? "no_code"}`);
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://kairox.jp"}/api/auth/tiktok/callback`;

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://kairox.jp";
    return NextResponse.redirect(`${base}/tiktok-studio?error=token_failed`);
  }

  const accessToken = tokenData.access_token;
  const openId = tokenData.open_id;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://kairox.jp";
  const res = NextResponse.redirect(
    `${base}/tiktok-studio?success=1&open_id=${openId}`
  );

  // Store token in httpOnly cookie (expires in 24h)
  res.cookies.set("tiktok_access_token", accessToken, {
    httpOnly: true,
    secure: true,
    maxAge: 86400,
    path: "/",
  });

  return res;
}
