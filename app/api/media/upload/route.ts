export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: "Meta non configurato" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }

  // Carica su Meta API
  const metaForm = new FormData();
  metaForm.append("file", file);
  metaForm.append("type", file.type);
  metaForm.append("messaging_product", "whatsapp");

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: metaForm,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: `Meta upload error: ${err}` }, { status: 500 });
  }

  const data = await response.json() as { id: string };

  return NextResponse.json({
    mediaId: data.id,
    mediaType: file.type,
    fileName: file.name,
  });
}
