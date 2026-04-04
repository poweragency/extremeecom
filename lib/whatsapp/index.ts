export interface WhatsAppSendResult {
  messageId: string;
  provider: string;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<WhatsAppSendResult> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";

  if (provider === "twilio") {
    const { sendViaTwilio } = await import("./twilio");
    return sendViaTwilio(to, body);
  } else if (provider === "meta") {
    const { sendViaMeta } = await import("./meta");
    return sendViaMeta(to, body);
  }

  throw new Error(`Provider WhatsApp non supportato: ${provider}`);
}

// Analisi della risposta del cliente
export function parseWhatsAppReply(text: string): "confirmed" | "rejected" | "unknown" {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .trim();

  const positiveKeywords = [
    "si", "sì", "s", "yes", "y", "ok", "okay",
    "confermo", "confermato", "conferma",
    "va bene", "vabene", "perfetto", "esatto",
    "certo", "certamente", "assolutamente",
    "d'accordo", "accordo", "giusto",
    "1", "👍",
  ];

  const negativeKeywords = [
    "no", "nope", "n",
    "annullo", "annullare", "annullato", "annulla",
    "cancella", "cancello", "cancellato",
    "non voglio", "non confermo",
    "rifiuto", "rifiutato",
    "0", "👎",
  ];

  for (const kw of positiveKeywords) {
    if (normalized === kw || normalized.startsWith(kw + " ") || normalized.includes(kw)) {
      // Verifica che non contenga parole negative
      const hasNegative = negativeKeywords.some((nkw) => normalized.includes(nkw));
      if (!hasNegative) return "confirmed";
    }
  }

  for (const kw of negativeKeywords) {
    if (normalized.includes(kw)) return "rejected";
  }

  return "unknown";
}
