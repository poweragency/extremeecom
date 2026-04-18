export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";

interface TelegramUpdate {
  message?: {
    text?: string;
    reply_to_message?: {
      text?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const update = await request.json() as TelegramUpdate;
  const message = update.message;

  // Ignora se non è una risposta a un nostro messaggio
  if (!message?.text || !message.reply_to_message?.text) {
    return NextResponse.json({ ok: true });
  }

  // Estrai il numero di telefono dalla notifica originale
  // Formato notifica: "📱 +393498408214"
  const originalText = message.reply_to_message.text;
  const phoneMatch = originalText.match(/📱\s*(\+\d+)/);
  if (!phoneMatch) {
    return NextResponse.json({ ok: true });
  }

  const phone = phoneMatch[1];
  const replyText = message.text;

  // Trova il lead più recente con quel numero
  const lead = await prisma.lead.findFirst({
    where: { customerPhone: phone },
    orderBy: { createdAt: "desc" },
  });

  if (!lead) {
    console.log(`[Telegram webhook] Nessun lead trovato per ${phone}`);
    return NextResponse.json({ ok: true });
  }

  // Invia WhatsApp al cliente
  try {
    await sendWhatsAppMessage(phone, replyText);
  } catch (err) {
    console.error("[Telegram webhook] Errore invio WhatsApp:", err);
    return NextResponse.json({ ok: true });
  }

  // Salva nel DB
  const saved = await prisma.message.create({
    data: { leadId: lead.id, direction: "outbound", body: replyText },
  });
  emitSSEEvent({ type: "message_created", leadId: lead.id, message: saved });

  // Conferma a Telegram con una reaction/risposta
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Messaggio inviato a ${lead.customerName}`,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
