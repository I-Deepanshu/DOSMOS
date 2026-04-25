import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // dosmos_session is a client-readable cookie set on the FRONTEND domain (Vercel)
  // after successful login. We cannot use the HttpOnly refreshToken because that
  // cookie lives on the backend domain (Render) and is invisible to this middleware.
  const hasSession = req.cookies.get("dosmos_session")?.value;
  if ((pathname.startsWith("/chat") || pathname.startsWith("/admin")) && !hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/register/:path*", "/chat/:path*", "/admin/:path*"],
};
