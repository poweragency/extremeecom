export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, shopifyDomain: true, createdAt: true },
  });
  return NextResponse.json(stores);
}

export async function POST(request: NextRequest) {
  const { name, shopifyDomain, webhookSecret } = await request.json() as {
    name?: string;
    shopifyDomain?: string;
    webhookSecret?: string;
  };

  if (!name?.trim() || !shopifyDomain?.trim() || !webhookSecret?.trim()) {
    return NextResponse.json({ error: "Tutti i campi sono obbligatori" }, { status: 400 });
  }

  try {
    const store = await prisma.store.create({
      data: { name: name.trim(), shopifyDomain: shopifyDomain.trim(), webhookSecret: webhookSecret.trim() },
      select: { id: true, name: true, shopifyDomain: true, createdAt: true },
    });
    return NextResponse.json(store, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Dominio già registrato" }, { status: 409 });
  }
}
