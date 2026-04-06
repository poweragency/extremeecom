"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Lead, LeadStatus, COLUMN_CONFIG } from "@/lib/types";
import { LeadCard } from "./LeadCard";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onOpenChat: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
}

const dotColors: Record<LeadStatus, string> = {
  PENDING: "bg-blue-400",
  CONFIRMED: "bg-emerald-400",
  SPEDITI: "bg-purple-400",
  NO_RESPONSE: "bg-amber-400",
  REJECTED: "bg-red-400",
};

export function KanbanColumn({ status, leads, onStatusChange, onOpenChat, onDelete }: KanbanColumnProps) {
  const config = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const total = leads.reduce((sum, l) => sum + parseFloat(l.totalPrice || "0"), 0);

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header colonna */}
      <div className="flex items-center gap-2 px-1 py-2 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[status]}`} />
        <h2 className="font-semibold text-sm text-[#191919]">{config.label}</h2>
        <span className="text-xs text-gray-400 font-medium ml-0.5">{leads.length}</span>
        {leads.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">€{total.toFixed(2)}</span>
        )}
      </div>

      {/* Area droppable */}
      <div
        ref={setNodeRef}
        className={`
          rounded-xl p-2 space-y-2 min-h-[200px] overflow-y-auto
          transition-all duration-150
          ${isOver ? "bg-black/5 ring-1 ring-black/10" : "bg-black/[0.02]"}
        `}
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-gray-300 select-none">
              Nessun lead
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={onStatusChange}
                onOpenChat={onOpenChat}
                onDelete={onDelete}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
