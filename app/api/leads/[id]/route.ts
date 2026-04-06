export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitSSEEvent } from "@/app/sse/emitter";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "SPEDITI", "NO_RESPONSE", "REJECTED"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { status?: string; notes?: string };

  const updateData: { status?: Status; notes?: string; confirmedAt?: Date | null } = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as Status)) {
      return NextResponse.json(
        { error: `Status non valido. Valori accettati: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    updateData.status = body.status as Status;
    if (body.status === "CONFIRMED") {
      updateData.confirmedAt = new Date();
    }
  }

  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    emitSSEEvent({ type: "lead_updated", lead });

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.lead.delete({ where: { id } });
    emitSSEEvent({ type: "lead_deleted", leadId: id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  }
}
