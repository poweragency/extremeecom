export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Salva i token nel DB
    await prisma.gmailToken.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?view=email`);
  } catch (err) {
    console.error("Gmail OAuth error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=auth_failed`);
  }
}
