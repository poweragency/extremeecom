"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead, COLUMN_CONFIG } from "@/lib/types";
import { formatTimeAgo, getTimeUntilDeadline } from "@/lib/utils";
import { Phone, MapPin, ShoppingBag, Clock, GripVertical } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: Lead["status"]) => void;
}

export function LeadCard({ lead, onStatusChange }: LeadCardProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  const config = COLUMN_CONFIG[lead.status];
  const deadline = lead.status === "PENDING" ? getTimeUntilDeadline(lead.responseDeadline) : null;

  const productsSummary = (lead.products as Array<{ name: string; quantity: number; price: string }>)
    .map((p) => `${p.quantity}x ${p.name}`)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-xl border shadow-sm p-4 cursor-default
        hover:shadow-md transition-shadow duration-200
        ${isDragging ? "shadow-xl ring-2 ring-blue-400 z-50" : ""}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
              {lead.shopifyOrderName}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm mt-1 truncate">
            {lead.customerName}
          </h3>
        </div>
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-0.5 flex-shrink-0"
          title="Trascina per spostare"
        >
          <GripVertical size={16} />
        </button>
      </div>

      {/* Info cliente */}
      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <Phone size={12} className="flex-shrink-0 text-gray-400" />
          <a
            href={`tel:${lead.customerPhone}`}
            className="hover:text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {lead.customerPhone}
          </a>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="flex-shrink-0 text-gray-400 mt-0.5" />
          <span className="line-clamp-2">{lead.customerAddress}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <ShoppingBag size={12} className="flex-shrink-0 text-gray-400 mt-0.5" />
          <span className="line-clamp-2">{productsSummary}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={11} />
          <span>{formatTimeAgo(lead.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer scadenza (solo per PENDING) */}
          {deadline && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                deadline.isExpired
                  ? "bg-red-100 text-red-600"
                  : deadline.isUrgent
                  ? "bg-orange-100 text-orange-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {deadline.isExpired ? "Scaduto" : `⏱ ${deadline.text}`}
            </span>
          )}

          {/* Totale */}
          <span className="text-xs font-semibold text-gray-700">
            €{lead.totalPrice}
          </span>
        </div>
      </div>

      {/* Quick actions - cambio status manuale */}
      <div className="mt-2 flex gap-1 flex-wrap">
        {lead.status !== "CONFIRMED" && (
          <button
            onClick={() => onStatusChange(lead.id, "CONFIRMED")}
            className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            ✓ Conferma
          </button>
        )}
        {lead.status !== "REJECTED" && (
          <button
            onClick={() => onStatusChange(lead.id, "REJECTED")}
            className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            ✗ Rifiuta
          </button>
        )}
        {lead.status !== "PENDING" && (
          <button
            onClick={() => onStatusChange(lead.id, "PENDING")}
            className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            ↩ Riapri
          </button>
        )}
      </div>
    </div>
  );
}
