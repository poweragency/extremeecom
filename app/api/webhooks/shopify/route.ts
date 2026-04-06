export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook, extractLeadFromOrder, ShopifyOrder, ShopifyFulfillment } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { emitSSEEvent } from "@/app/sse/emitter";

export async function POST(request: NextRequest) {
  const topic = request.headers.get("x-shopify-topic") ?? "unknown";
  const signature = request.headers.get("x-shopify-hmac-sha256");
  console.log(`[Shopify webhook] topic=${topic} signature=${signature ? "present" : "missing"}`);

  if (!signature) {
    console.log("[Shopify webhook] REJECTED: firma mancante");
    return NextResponse.json({ error: "Firma mancante" }, { status: 401 });
  }

  const rawBody = await request.text();

  // Trova lo store corrispondente alla firma
  const stores = await prisma.store.findMany();
  let matchedStoreId: string | null = null;

  for (const store of stores) {
    if (verifyShopifyWebhook(rawBody, signature, store.webhookSecret)) {
      matchedStoreId = store.id;
      break;
    }
  }

  // Fallback al secret globale (legacy)
  if (!matchedStoreId) {
    const envSecret = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
    if (!verifyShopifyWebhook(rawBody, signature, envSecret)) {
      console.log("[Shopify webhook] REJECTED: HMAC non valido (nessuno store corrisponde, env secret fallito)");
      return NextResponse.json({ error: "Firma non valida" }, { status: 401 });
    }
    console.log("[Shopify webhook] HMAC ok via env secret");
  } else {
    console.log(`[Shopify webhook] HMAC ok via store ${matchedStoreId}`);
  }

  // Gestione fulfillments/create (spedizione con tracking)
  if (topic === "fulfillments/create") {
    let fulfillment: ShopifyFulfillment;
    try {
      fulfillment = JSON.parse(rawBody) as ShopifyFulfillment;
    } catch {
      return NextResponse.json({ error: "Body non valido" }, { status: 400 });
    }

    const trackingNumber =
      fulfillment.tracking_number ??
      fulfillment.tracking_numbers?.[0] ??
      null;

    const lead = await prisma.lead.findFirst({
      where: { shopifyOrderId: String(fulfillment.order_id), status: "CONFIRMED" },
    });

    if (!lead) {
      return NextResponse.json({ message: "Lead non trovato o non confermato" }, { status: 200 });
    }

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "SPEDITI",
        trackingCode: trackingNumber,
        shippedAt: new Date(),
      },
    });

    // Invia WhatsApp con tracking
    if (lead.customerPhone && trackingNumber) {
      try {
        const message = `${lead.customerName}|${lead.shopifyOrderName}|${trackingNumber}|spedito`;
        await sendWhatsAppMessage(lead.customerPhone, message);
      } catch (err) {
        console.error(`Errore invio WhatsApp tracking per ordine ${lead.shopifyOrderName}:`, err);
      }
    }

    emitSSEEvent({ type: "lead_updated", lead: updatedLead });
    return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 });
  }

  // Gestione orders/create (logica esistente)
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
      storeId: matchedStoreId,
    },
  });

  // Invia messaggio WhatsApp
  if (leadData.customerPhone) {
    try {
      const message = `${leadData.customerName}|${leadData.shopifyOrderName}|${leadData.totalPrice}`;
      const result = await sendWhatsAppMessage(leadData.customerPhone, message);
      await prisma.lead.update({
        where: { id: lead.id },
        data: { whatsappMessageId: result.messageId },
      });
    } catch (err) {
      console.error(`Errore invio WhatsApp per ordine ${order.name}:`, err);
    }
  }

  const finalLead = await prisma.lead.findUnique({ where: { id: lead.id } });
  emitSSEEvent({ type: "lead_created", lead: finalLead });

  return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
}
