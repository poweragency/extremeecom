export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { sendMediaViaMeta } from "@/lib/whatsapp/meta";
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

// POST: invia messaggio manuale (testo o media)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const payload = await request.json() as {
    body?: string;
    mediaId?: string;
    mediaType?: string;
    fileName?: string;
  };

  const isMedia = !!payload.mediaId;

  if (!isMedia && !payload.body?.trim()) {
    return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }

  // Invia WhatsApp
  try {
    if (isMedia) {
      await sendMediaViaMeta(lead.customerPhone, payload.mediaId!, payload.mediaType!, payload.fileName);
    } else {
      await sendWhatsAppMessage(lead.customerPhone, payload.body!);
    }
  } catch (err) {
    return NextResponse.json({ error: `Errore invio: ${String(err)}` }, { status: 500 });
  }

  // Corpo da salvare nel DB
  const savedBody = isMedia
    ? payload.mediaType!.startsWith("image/")
      ? "🖼️ Immagine"
      : payload.mediaType!.startsWith("video/")
      ? "🎥 Video"
      : payload.mediaType!.startsWith("audio/")
      ? "🎵 Audio"
      : `📎 ${payload.fileName ?? "Documento"}`
    : payload.body!;

  const message = await prisma.message.create({
    data: {
      leadId: params.id,
      direction: "outbound",
      body: savedBody,
    },
  });

  emitSSEEvent({ type: "message_created", leadId: params.id, message });

  return NextResponse.json(message, { status: 201 });
}
