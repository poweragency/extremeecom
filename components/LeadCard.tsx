"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/lib/types";
import { formatTimeAgo, getTimeUntilDeadline } from "@/lib/utils";
import { Phone, MapPin, ShoppingBag, Clock, GripVertical, MessageCircle, Trash2, Package } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: Lead["status"]) => void;
  onOpenChat: (lead: Lead) => void;
  onDelete?: (leadId: string) => void;
}

export function LeadCard({ lead, onStatusChange, onOpenChat, onDelete }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const deadline = lead.status === "PENDING" ? getTimeUntilDeadline(lead.responseDeadline) : null;

  const productsSummary = (lead.products as Array<{ name: string; quantity: number; price: string }>)
    .map((p) => `${p.quantity}x ${p.name}`)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-lg border border-black/[0.06] shadow-sm p-3.5 cursor-default
        hover:shadow-md hover:border-black/10 transition-all duration-150
        ${isDragging ? "shadow-xl ring-1 ring-black/10 z-50" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-gray-400">{lead.shopifyOrderName}</span>
          <h3 className="font-semibold text-[#191919] text-sm mt-0.5 truncate leading-snug">
            {lead.customerName}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-semibold text-[#191919]">€{lead.totalPrice}</span>
          <button
            {...attributes}
            {...listeners}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-0.5"
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>

      {/* Info cliente */}
      <div className="space-y-1.5 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Phone size={11} className="flex-shrink-0" />
          <span>{lead.customerPhone}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin size={11} className="flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">{lead.customerAddress}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <ShoppingBag size={11} className="flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">{productsSummary}</span>
        </div>
        {lead.trackingCode && (
          <div className="flex items-center gap-1.5 mt-1">
            <Package size={11} className="flex-shrink-0 text-purple-400" />
            <span className="text-purple-500 font-medium text-[11px]">{lead.trackingCode}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-gray-300">
          <Clock size={10} />
          <span>{formatTimeAgo(lead.createdAt)}</span>
        </div>
        {deadline && (
          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
            deadline.isExpired ? "bg-red-50 text-red-500" :
            deadline.isUrgent ? "bg-amber-50 text-amber-600" :
            "bg-gray-50 text-gray-400"
          }`}>
            {deadline.isExpired ? "Scaduto" : `⏱ ${deadline.text}`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-2.5 flex gap-1.5">
        <button
          onClick={() => onOpenChat(lead)}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors font-medium"
        >
          <MessageCircle size={11} />
          Chat
        </button>
        {lead.status !== "CONFIRMED" && lead.status !== "SPEDITI" && (
          <button
            onClick={() => onStatusChange(lead.id, "CONFIRMED")}
            className="text-[11px] px-2 py-1 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            ✓ Conferma
          </button>
        )}
        {lead.status !== "REJECTED" && (
          <button
            onClick={() => onStatusChange(lead.id, "REJECTED")}
            className="text-[11px] px-2 py-1 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            ✗ Rifiuta
          </button>
        )}
        {lead.status !== "PENDING" && (
          <button
            onClick={() => onStatusChange(lead.id, "PENDING")}
            className="text-[11px] px-2 py-1 rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            ↩
          </button>
        )}
        {lead.status === "REJECTED" && onDelete && (
          <button
            onClick={() => onDelete(lead.id)}
            className="ml-auto text-[11px] px-2 py-1 rounded-md bg-red-50 text-red-400 hover:bg-red-100 transition-colors flex items-center gap-1"
          >
            <Trash2 size={11} />
            Elimina
          </button>
        )}
      </div>
    </div>
  );
}
