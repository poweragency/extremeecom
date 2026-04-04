"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Lead, LeadStatus, COLUMN_CONFIG } from "@/lib/types";
import { LeadCard } from "./LeadCard";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export function KanbanColumn({ status, leads, onStatusChange }: KanbanColumnProps) {
  const config = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header colonna */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b-2 ${config.bgColor} ${config.borderColor}`}
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dotColor}`} />
        <h2 className={`font-semibold text-sm ${config.color} flex-1`}>
          {config.label}
        </h2>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color} border ${config.borderColor}`}
        >
          {leads.length}
        </span>
      </div>

      {/* Area droppable */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 rounded-b-xl border-x border-b p-2 space-y-2 min-h-[200px] overflow-y-auto
          transition-colors duration-150
          ${config.borderColor}
          ${isOver ? `${config.bgColor} ring-2 ${config.borderColor}` : "bg-gray-50/50"}
        `}
      >
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-xs text-gray-400">
              Nessun lead
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
