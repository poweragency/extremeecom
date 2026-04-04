export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendGmailMessage, refreshAccessToken } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  const { to, subject, body } = await request.json() as { to: string; subject: string; body: string };

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Campi mancanti" }, { status: 400 });
  }

  const tokenRecord = await prisma.gmailToken.findUnique({ where: { id: "default" } });
  if (!tokenRecord) {
    return NextResponse.json({ error: "Gmail non connesso" }, { status: 401 });
  }

  let accessToken = tokenRecord.accessToken;
  if (tokenRecord.expiresAt < new Date()) {
    accessToken = await refreshAccessToken(tokenRecord.refreshToken);
    await prisma.gmailToken.update({
      where: { id: "default" },
      data: { accessToken, expiresAt: new Date(Date.now() + 3600 * 1000) },
    });
  }

  await sendGmailMessage(accessToken, to, subject, body);
  return NextResponse.json({ success: true });
}
