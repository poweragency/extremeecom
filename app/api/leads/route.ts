export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");

  const leads = await prisma.lead.findMany({
    where: storeId ? { storeId } : {},
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}
