export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";

export async function POST(request: NextRequest) {
  const { status, message, storeId } = await request.json() as {
    status: string;
    message: string;
    storeId?: string;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
  }

  const leads = await prisma.lead.findMany({
    where: {
      status: status as never,
      ...(storeId ? { storeId } : {}),
    },
  });

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    if (!lead.customerPhone) { failed++; continue; }
    try {
      const result = await sendWhatsAppMessage(lead.customerPhone, message);
      await prisma.message.create({
        data: {
          leadId: lead.id,
          direction: "outbound",
          body: message,
          whatsappMsgId: result.messageId,
          status: "sent",
        },
      });
      emitSSEEvent({ type: "message_created", leadId: lead.id });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ total: leads.length, sent, failed });
}
