import { NextRequest, NextResponse } from "next/server";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? "ExtremeEcom2024";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Percorsi pubblici (webhook, API esterne)
  const publicPaths = [
    "/api/webhooks/",
    "/api/email/callback",
    "/api/email/auth",
    "/login",
    "/api/auth/",
  ];

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Controlla il cookie di sessione
  const session = request.cookies.get("session")?.value;
  if (session !== DASHBOARD_PASSWORD) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
