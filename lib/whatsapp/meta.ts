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

  // Estrai i parametri dal corpo del messaggio per il template
  // Il body viene passato come "nome|ordine|totale" quando si usa il template
  const parts = body.split("|");

  let requestBody: object;

  if (parts.length === 4 && parts[3] === "spedito") {
    // Template "ordine_spedito": nome|ordine|tracking|spedito
    requestBody = {
      messaging_product: "whatsapp",
      to: toFormatted,
      type: "template",
      template: {
        name: "ordine_spedito",
        language: { code: "it" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: parts[0] }, // customer_name
              { type: "text", text: parts[1] }, // order_id
              { type: "text", text: parts[2] }, // tracking_number
            ],
          },
        ],
      },
    };
  } else if (parts.length === 3) {
    // Usa il template approvato "conferma_ordine"
    requestBody = {
      messaging_product: "whatsapp",
      to: toFormatted,
      type: "template",
      template: {
        name: "conferma_ordine",
        language: { code: "it" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: parts[0] }, // customer_name
              { type: "text", text: parts[1] }, // order_id
              { type: "text", text: parts[2] }, // order_total
            ],
          },
        ],
      },
    };
  } else {
    // Messaggio libero (solo se il cliente ha già scritto nelle ultime 24h)
    requestBody = {
      messaging_product: "whatsapp",
      to: toFormatted,
      type: "text",
      text: { body },
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
