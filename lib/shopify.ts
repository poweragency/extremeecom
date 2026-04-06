import crypto from "crypto";

export function verifyShopifyWebhook(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface ShopifyOrder {
  id: number;
  name: string; // es. "#1001"
  email: string;
  phone: string | null;
  total_price: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone: string | null;
  } | null;
  billing_address: {
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
    variant_title: string | null;
  }>;
}

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: string;
  tracking_number: string | null;
  tracking_numbers: string[];
  tracking_company: string | null;
}

export function extractLeadFromOrder(order: ShopifyOrder) {
  const address = order.shipping_address ?? order.billing_address;
  const firstName = address?.first_name ?? "";
  const lastName = address?.last_name ?? "";

  // Il telefono può essere nell'ordine, nell'indirizzo di spedizione o billing
  const phone =
    order.phone ??
    order.shipping_address?.phone ??
    order.billing_address?.phone ??
    "";

  const formattedAddress = order.shipping_address
    ? `${order.shipping_address.address1}, ${order.shipping_address.zip} ${order.shipping_address.city} (${order.shipping_address.province})`
    : "Indirizzo non disponibile";

  const products = order.line_items.map((item) => ({
    name: item.variant_title
      ? `${item.title} - ${item.variant_title}`
      : item.title,
    quantity: item.quantity,
    price: item.price,
  }));

  return {
    shopifyOrderId: String(order.id),
    shopifyOrderName: order.name,
    customerName: `${firstName} ${lastName}`.trim(),
    customerPhone: normalizePhone(phone),
    customerAddress: formattedAddress,
    products,
    totalPrice: order.total_price,
  };
}

// Normalizza il numero di telefono in formato internazionale E.164
function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Rimuove spazi, trattini, parentesi
  let cleaned = phone.replace(/[\s\-()]/g, "");
  // Se inizia con 0 (numero italiano locale), sostituisce con +39
  if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
    cleaned = "+39" + cleaned.slice(1);
  }
  // Se inizia con 00, sostituisce con +
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  // Se non ha il + e sembra un numero italiano (10 cifre), aggiunge +39
  if (!cleaned.startsWith("+") && cleaned.length === 10) {
    cleaned = "+39" + cleaned;
  }
  // Shopify a volte aggiunge +44 (UK) ai numeri italiani — correggi
  if (cleaned.startsWith("+44") && cleaned.length === 13) {
    const digits = cleaned.slice(3);
    // Se le cifre sembrano un mobile italiano (inizia con 3), usa +39
    if (digits.startsWith("3")) {
      cleaned = "+39" + digits;
    }
  }
  return cleaned;
}
