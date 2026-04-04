import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook, extractLeadFromOrder, ShopifyOrder } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-shopify-hmac-sha256");
  if (!signature) {
    return NextResponse.json({ error: "Firma mancante" }, { status: 401 });
  }

  const rawBody = await request.text();

  if (!verifyShopifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Firma non valida" }, { status: 401 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  // Evita duplicati
  const existing = await prisma.lead.findUnique({
    where: { shopifyOrderId: String(order.id) },
  });
  if (existing) {
    return NextResponse.json({ message: "Ordine già elaborato" }, { status: 200 });
  }

  const leadData = extractLeadFromOrder(order);

  if (!leadData.customerPhone) {
    console.warn(`Ordine ${order.name}: telefono mancante, lead creato senza WhatsApp`);
  }

  const noResponseHours = parseInt(process.env.NO_RESPONSE_HOURS ?? "24", 10);
  const responseDeadline = new Date(Date.now() + noResponseHours * 60 * 60 * 1000);

  const lead = await prisma.lead.create({
    data: {
      ...leadData,
      products: leadData.products,
      responseDeadline,
    },
  });

  // Invia messaggio WhatsApp se il numero è disponibile
  let whatsappMessageId: string | undefined;
  if (leadData.customerPhone) {
    try {
      const productNames = leadData.products
        .map((p) => `${p.quantity}x ${p.name}`)
        .join(", ");

      const message =
        `Ciao ${leadData.customerName}! 👋\n\n` +
        `Abbiamo ricevuto il tuo ordine ${leadData.shopifyOrderName} per: *${productNames}*.\n` +
        `Totale: €${leadData.totalPrice}\n\n` +
        `Puoi confermare la consegna? Rispondi *SI* per confermare o *NO* per annullare. 🙏`;

      const result = await sendWhatsAppMessage(leadData.customerPhone, message);
      whatsappMessageId = result.messageId;

      await prisma.lead.update({
        where: { id: lead.id },
        data: { whatsappMessageId },
      });
    } catch (err) {
      console.error(`Errore invio WhatsApp per ordine ${order.name}:`, err);
    }
  }

  // Aggiorna il lead con eventuale messageId e notifica SSE
  const finalLead = await prisma.lead.findUnique({ where: { id: lead.id } });
  emitSSEEvent({ type: "lead_created", lead: finalLead });

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
}
