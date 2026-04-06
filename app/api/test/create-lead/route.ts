export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";

// Endpoint di test - GET o POST
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone") ?? "+39XXXXXXXXXX";

  const orderId = `TEST_${Date.now()}`;
  const noResponseHours = parseInt(process.env.NO_RESPONSE_HOURS ?? "24", 10);
  const responseDeadline = new Date(Date.now() + noResponseHours * 60 * 60 * 1000);

  const lead = await prisma.lead.create({
    data: {
      shopifyOrderId: orderId,
      shopifyOrderName: `#TEST${Date.now().toString().slice(-4)}`,
      customerName: "Mario Rossi",
      customerPhone: phone,
      customerAddress: "Via Roma 1, 20121 Milano (MI)",
      products: [{ name: "Prodotto Test", quantity: 1, price: "29.99" }],
      totalPrice: "29.99",
      responseDeadline,
    },
  });

  // Invia WhatsApp se il numero è reale
  if (!phone.includes("X")) {
    try {
      // Formato template Meta: "nome|ordine|totale"
      const message = `Mario Rossi|${lead.shopifyOrderName}|29.99`;

      const result = await sendWhatsAppMessage(phone, message);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { whatsappMessageId: result.messageId },
      });
    } catch (err) {
      console.error("Errore WhatsApp test:", err);
      return NextResponse.json({ success: true, lead, whatsappError: String(err) }, { status: 201 });
    }
  }

  emitSSEEvent({ type: "lead_created", lead });
  return NextResponse.json({ success: true, lead }, { status: 201 });
}
