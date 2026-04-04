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
import { RefreshCw, Wifi, WifiOff } from "lucide-react";

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Carica i lead iniziali
  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json() as Lead[];
        setLeads(data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Errore caricamento lead:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Connessione SSE per aggiornamenti real-time
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      eventSource = new EventSource("/sse");

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as {
          type: string;
          lead?: Lead;
          leadId?: string;
        };

        if (data.type === "connected") return;

        setLastUpdate(new Date());

        if (data.type === "lead_created" && data.lead) {
          setLeads((prev) => {
            // Evita duplicati
            if (prev.some((l) => l.id === data.lead!.id)) return prev;
            return [data.lead!, ...prev];
          });
        } else if (data.type === "lead_updated" && data.lead) {
          setLeads((prev) =>
            prev.map((l) => (l.id === data.lead!.id ? data.lead! : l))
          );
        } else if (data.type === "lead_deleted" && data.leadId) {
          setLeads((prev) => prev.filter((l) => l.id !== data.leadId));
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        // Riconnetti dopo 5 secondi
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // Aggiorna status via API
  const updateLeadStatus = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      // Ottimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );

      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          // Rollback in caso di errore
          await loadLeads();
        }
      } catch {
        await loadLeads();
      }
    },
    [loadLeads]
  );

  // Sensori DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

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

    // Se stiamo trascinando sopra una colonna
    if (COLUMN_ORDER.includes(overId as LeadStatus)) {
      const newStatus = overId as LeadStatus;
      if (activeLead.status !== newStatus) {
        setLeads((prev) =>
          prev.map((l) => (l.id === activeId ? { ...l, status: newStatus } : l))
        );
      }
      return;
    }

    // Se stiamo trascinando sopra un'altra card
    const overLead = leads.find((l) => l.id === overId);
    if (!overLead) return;

    if (activeLead.status !== overLead.status) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeId ? { ...l, status: overLead.status } : l
        )
      );
    } else {
      // Riordina nella stessa colonna
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

    // Determina il nuovo status
    let newStatus: LeadStatus = activeLead.status;

    if (COLUMN_ORDER.includes(over.id as LeadStatus)) {
      newStatus = over.id as LeadStatus;
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) newStatus = overLead.status;
    }

    if (newStatus !== activeLead.status) {
      await updateLeadStatus(activeId, newStatus);
    }
  }

  const leadsByStatus = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = leads.filter((l) => l.status === status);
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <h1 className="font-bold text-gray-900">ExtremeEcom CRM</h1>
          <span className="text-xs text-gray-400">Conferme Ordini</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Stato connessione SSE */}
          <div className="flex items-center gap-1.5 text-xs">
            {isConnected ? (
              <>
                <Wifi size={14} className="text-green-500" />
                <span className="text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-red-400" />
                <span className="text-red-500">Disconnesso</span>
              </>
            )}
          </div>

          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Aggiornato:{" "}
              {lastUpdate.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}

          <button
            onClick={loadLeads}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} />
            Aggiorna
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="bg-white border-b px-6 py-2 flex gap-6 flex-shrink-0">
        {COLUMN_ORDER.map((status) => {
          const count = leadsByStatus[status].length;
          return (
            <div key={status} className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{count}</span>
              <span className="text-gray-700 font-medium">
                {status === "PENDING" && "In attesa"}
                {status === "CONFIRMED" && "Confermati"}
                {status === "NO_RESPONSE" && "Senza risposta"}
                {status === "REJECTED" && "Rifiutati"}
              </span>
            </div>
          );
        })}
        <div className="ml-auto text-sm text-gray-500">
          Tot. {leads.length} ordini
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">Caricamento...</div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-4 gap-3 h-full">
              {COLUMN_ORDER.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  leads={leadsByStatus[status]}
                  onStatusChange={updateLeadStatus}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead ? (
                <div className="rotate-2 opacity-90">
                  <LeadCard
                    lead={activeLead}
                    onStatusChange={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
