export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWhatsAppReply } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// GET: verifica webhook Meta (challenge)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verifica fallita" }, { status: 403 });
}

// POST: riceve messaggi in entrata da Twilio o Meta
export async function POST(request: NextRequest) {
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";

  if (provider === "twilio") {
    return handleTwilioWebhook(request);
  } else {
    return handleMetaWebhook(request);
  }
}

async function handleTwilioWebhook(request: NextRequest) {
  // Twilio invia come application/x-www-form-urlencoded
  const formData = await request.formData();
  const from = formData.get("From")?.toString() ?? "";
  const body = formData.get("Body")?.toString() ?? "";

  if (!from || !body) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  // Twilio invia il numero come "whatsapp:+39XXXXXXXXXX"
  const phone = from.replace("whatsapp:", "");
  await processReply(phone, body);

  // Twilio si aspetta TwiML in risposta (risposta vuota va bene)
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    }
  );
}

async function handleMetaWebhook(request: NextRequest) {
  const body = await request.json() as MetaWebhookPayload;

  // Conferma ricezione a Meta
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const message of messages) {
        if (message.type === "text" && message.text?.body) {
          const phone = "+" + message.from;
          await processReply(phone, message.text.body);
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function processReply(phone: string, text: string) {
  // Trova il lead più recente con questo numero in stato PENDING
  const lead = await prisma.lead.findFirst({
    where: {
      customerPhone: phone,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!lead) {
    console.log(`Nessun lead PENDING trovato per ${phone}`);
    return;
  }

  const intent = parseWhatsAppReply(text);

  if (intent === "confirmed") {
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
    emitSSEEvent({ type: "lead_updated", lead: updated });
  } else if (intent === "rejected") {
    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "REJECTED" },
    });
    emitSSEEvent({ type: "lead_updated", lead: updated });
  } else {
    // Risposta non riconosciuta: chiedi di nuovo
    try {
      await sendWhatsAppMessage(
        phone,
        `Non ho capito la tua risposta. Scrivi *SI* per confermare l'ordine ${lead.shopifyOrderName} o *NO* per annullare. 🙏`
      );
    } catch (err) {
      console.error("Errore invio messaggio di chiarimento:", err);
    }
  }
}

// Tipi per il payload Meta
interface MetaWebhookPayload {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        messages: Array<{
          from: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}
