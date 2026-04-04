export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password: string };
  const correctPassword = process.env.DASHBOARD_PASSWORD ?? "ExtremeEcom2024";

  if (password !== correctPassword) {
    return NextResponse.json({ error: "Password errata" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", correctPassword, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 giorni
    path: "/",
  });

  return response;
}
