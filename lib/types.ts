export type LeadStatus = "PENDING" | "CONFIRMED" | "NO_RESPONSE" | "REJECTED";

export interface Product {
  name: string;
  quantity: number;
  price: string;
}

export interface Lead {
  id: string;
  shopifyOrderId: string;
  shopifyOrderName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  products: Product[];
  totalPrice: string;
  status: LeadStatus;
  whatsappMessageId: string | null;
  responseDeadline: string;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const COLUMN_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  PENDING: {
    label: "Leads",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  CONFIRMED: {
    label: "Confermati",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    dotColor: "bg-green-500",
  },
  NO_RESPONSE: {
    label: "No Response",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    dotColor: "bg-orange-500",
  },
  REJECTED: {
    label: "Non Confermati",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    dotColor: "bg-red-500",
  },
};

export const COLUMN_ORDER: LeadStatus[] = [
  "PENDING",
  "CONFIRMED",
  "NO_RESPONSE",
  "REJECTED",
];
