"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Lead, LeadStatus, COLUMN_ORDER } from "@/lib/types";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";
import { ChatPanel } from "./ChatPanel";
import { RefreshCw, WifiOff } from "lucide-react";

interface KanbanBoardProps {
  storeId: string | null;
}

export function KanbanBoard({ storeId }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [chatLead, setChatLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      const url = storeId ? `/api/leads?storeId=${storeId}` : "/api/leads";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json() as Lead[];
        setLeads(data);
      }
    } catch (err) {
      console.error("Errore caricamento lead:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads, storeId]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource("/sse");
      eventSource.onopen = () => setIsConnected(true);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as {
          type: string;
          lead?: Lead;
          leadId?: string;
        };
        if (data.type === "connected") return;

        if (data.type === "lead_created" && data.lead) {
          if (storeId !== null && data.lead.storeId !== storeId) return;
          setLeads((prev) => {
            if (prev.some((l) => l.id === data.lead!.id)) return prev;
            return [data.lead!, ...prev];
          });
        } else if (data.type === "lead_updated" && data.lead) {
          setLeads((prev) => prev.map((l) => (l.id === data.lead!.id ? data.lead! : l)));
        } else if (data.type === "lead_deleted" && data.leadId) {
          setLeads((prev) => prev.filter((l) => l.id !== data.leadId));
        }
      };
      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const deleteLead = useCallback(async (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
  }, []);

  const updateLeadStatus = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) await loadLeads();
      } catch {
        await loadLeads();
      }
    },
    [loadLeads]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeLead = activeLeadId ? leads.find((l) => l.id === activeLeadId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveLeadId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeLead = leads.find((l) => l.id === activeId);
    if (!activeLead) return;
    if (COLUMN_ORDER.includes(overId as LeadStatus)) {
      const newStatus = overId as LeadStatus;
      if (activeLead.status !== newStatus) {
        setLeads((prev) => prev.map((l) => (l.id === activeId ? { ...l, status: newStatus } : l)));
      }
      return;
    }
    const overLead = leads.find((l) => l.id === overId);
    if (!overLead) return;
    if (activeLead.status !== overLead.status) {
      setLeads((prev) => prev.map((l) => l.id === activeId ? { ...l, status: overLead.status } : l));
    } else {
      const activeIndex = leads.findIndex((l) => l.id === activeId);
      const overIndex = leads.findIndex((l) => l.id === overId);
      setLeads((prev) => arrayMove(prev, activeIndex, overIndex));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLeadId(null);
    if (!over) return;
    const activeId = active.id as string;
    const activeLead = leads.find((l) => l.id === activeId);
    if (!activeLead) return;
    let newStatus: LeadStatus = activeLead.status;
    if (COLUMN_ORDER.includes(over.id as LeadStatus)) {
      newStatus = over.id as LeadStatus;
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) newStatus = overLead.status;
    }
    if (newStatus !== activeLead.status) await updateLeadStatus(activeId, newStatus);
  }

  const leadsByStatus = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = leads.filter((l) => l.status === status);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const totalRevenue = leads
    .filter((l) => l.status === "CONFIRMED")
    .reduce((sum, l) => sum + parseFloat(l.totalPrice || "0"), 0);

  return (
    <div className="flex flex-col h-full bg-[#f7f7f5]">
      {/* Header stile Notion */}
      <header className="bg-[#f7f7f5] px-8 pt-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-[#191919] tracking-tight">Conferme Ordini</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {leads.length} ordini totali · €{totalRevenue.toFixed(2)} confermati
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              {isConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="text-red-400" />
                  <span className="text-red-500">Offline</span>
                </>
              )}
            </div>

            <button
              onClick={loadLeads}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-black/5 transition-colors"
            >
              <RefreshCw size={12} />
              Aggiorna
            </button>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex gap-2 mt-4 mb-4">
          {COLUMN_ORDER.map((status) => {
            const count = leadsByStatus[status].length;
            const colors: Record<string, string> = {
              PENDING: "bg-blue-50 text-blue-600 border-blue-100",
              CONFIRMED: "bg-emerald-50 text-emerald-600 border-emerald-100",
              SPEDITI: "bg-purple-50 text-purple-600 border-purple-100",
              NO_RESPONSE: "bg-amber-50 text-amber-600 border-amber-100",
              REJECTED: "bg-red-50 text-red-500 border-red-100",
            };
            const labels: Record<string, string> = {
              PENDING: "In attesa",
              CONFIRMED: "Confermati",
              SPEDITI: "Spediti",
              NO_RESPONSE: "No risposta",
              REJECTED: "Rifiutati",
            };
            return (
              <div key={status} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${colors[status]}`}>
                <span className="font-bold">{count}</span>
                <span className="opacity-75">{labels[status]}</span>
              </div>
            );
          })}
        </div>

        <div className="border-b border-black/5" />
      </header>

      {/* Board + Chat */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden px-8 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-300 text-sm">Caricamento...</div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-5 gap-4 h-full">
                {COLUMN_ORDER.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    leads={leadsByStatus[status]}
                    onStatusChange={updateLeadStatus}
                    onOpenChat={setChatLead}
                    onDelete={deleteLead}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeLead ? (
                  <div className="rotate-1 opacity-95 scale-105">
                    <LeadCard lead={activeLead} onStatusChange={() => {}} onOpenChat={() => {}} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {chatLead && (
          <ChatPanel lead={chatLead} onClose={() => setChatLead(null)} />
        )}
      </div>
    </div>
  );
}
