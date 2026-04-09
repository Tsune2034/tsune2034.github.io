import { NextRequest, NextResponse } from "next/server";

const CANONICAL = "kairox.jp";
const ALLOWED = new Set([CANONICAL, `www.${CANONICAL}`]);

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  if (host === "localhost" || host === "127.0.0.1") return NextResponse.next();
  if (!ALLOWED.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
