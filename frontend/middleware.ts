import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /chat and /admin — need valid session
  const hasSession = req.cookies.get("refreshToken")?.value;
  if ((pathname.startsWith("/chat") || pathname.startsWith("/admin")) && !hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/register/:path*", "/chat/:path*", "/admin/:path*"],
};
