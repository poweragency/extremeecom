import type { WhatsAppSendResult } from "./index";

export async function sendViaMeta(
  to: string,
  body: string
): Promise<WhatsAppSendResult> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("Variabili Meta non configurate (META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID)");
  }

  // Rimuove il + dal numero per Meta API
  const toFormatted = to.replace(/^\+/, "");

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toFormatted,
        type: "text",
        text: { body },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meta API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as { messages: Array<{ id: string }> };
  return {
    messageId: data.messages[0].id,
    provider: "meta",
  };
}
