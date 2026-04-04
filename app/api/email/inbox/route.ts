export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGmailMessages, refreshAccessToken } from "@/lib/gmail";

export async function GET() {
  try {
    const tokenRecord = await prisma.gmailToken.findUnique({ where: { id: "default" } });

    if (!tokenRecord) {
      return NextResponse.json({ connected: false, emails: [] });
    }

    let accessToken = tokenRecord.accessToken;

    // Rinnova il token se scaduto
    if (tokenRecord.expiresAt < new Date()) {
      accessToken = await refreshAccessToken(tokenRecord.refreshToken);
      await prisma.gmailToken.update({
        where: { id: "default" },
        data: {
          accessToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });
    }

    const emails = await getGmailMessages(accessToken);
    return NextResponse.json({ connected: true, emails });
  } catch (err) {
    console.error("Errore inbox:", err);
    return NextResponse.json({ connected: false, emails: [], error: String(err) });
  }
}
