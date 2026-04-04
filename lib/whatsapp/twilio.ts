import type { WhatsAppSendResult } from "./index";

export async function sendViaTwilio(
  to: string,
  body: string
): Promise<WhatsAppSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error("Variabili Twilio non configurate (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER)");
  }

  // Formatta il numero destinatario per Twilio WhatsApp
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const { default: twilio } = await import("twilio");
  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    from,
    to: toFormatted,
    body,
  });

  return {
    messageId: message.sid,
    provider: "twilio",
  };
}
