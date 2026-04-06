export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";

// GET: carica messaggi di un lead
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const messages = await prisma.message.findMany({
    where: { leadId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

// POST: invia messaggio manuale
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { body } = await request.json() as { body: string };

  if (!body?.trim()) {
    return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }

  // Invia WhatsApp
  try {
    await sendWhatsAppMessage(lead.customerPhone, body);
  } catch (err) {
    return NextResponse.json({ error: `Errore invio: ${String(err)}` }, { status: 500 });
  }

  // Salva nel DB
  const message = await prisma.message.create({
    data: {
      leadId: params.id,
      direction: "outbound",
      body,
    },
  });

  emitSSEEvent({ type: "message_created", leadId: params.id, message });

  return NextResponse.json(message, { status: 201 });
}
