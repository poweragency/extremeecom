import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitSSEEvent } from "@/app/sse/emitter";

export async function GET(request: NextRequest) {
  // Protezione con secret per evitare chiamate non autorizzate
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const now = new Date();

  // Trova tutti i lead PENDING scaduti
  const expiredLeads = await prisma.lead.findMany({
    where: {
      status: "PENDING",
      responseDeadline: { lt: now },
    },
  });

  if (expiredLeads.length === 0) {
    return NextResponse.json({ updated: 0, message: "Nessun lead scaduto" });
  }

  // Aggiorna in batch
  await prisma.lead.updateMany({
    where: {
      id: { in: expiredLeads.map((l) => l.id) },
    },
    data: { status: "NO_RESPONSE" },
  });

  // Emetti evento SSE per ognuno
  for (const lead of expiredLeads) {
    emitSSEEvent({
      type: "lead_updated",
      lead: { ...lead, status: "NO_RESPONSE" },
    });
  }

  console.log(`Cron: ${expiredLeads.length} lead spostati in NO_RESPONSE`);

  return NextResponse.json({
    updated: expiredLeads.length,
    ids: expiredLeads.map((l) => l.id),
  });
}
