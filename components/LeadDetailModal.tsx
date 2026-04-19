"use client";

import { useState, useEffect } from "react";
import { X, Phone, MapPin, ShoppingBag, Package, MessageCircle, Clock, FileText, Save, Loader2 } from "lucide-react";
import { Lead, COLUMN_CONFIG } from "@/lib/types";

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onOpenChat: (lead: Lead) => void;
  onLeadUpdate: (updatedLead: Lead) => void;
}

export function LeadDetailModal({ lead, onClose, onOpenChat, onLeadUpdate }: LeadDetailModalProps) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Chiudi con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const saveNotes = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const updated = await res.json() as Lead;
        onLeadUpdate(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const config = COLUMN_CONFIG[lead.status];
  const products = lead.products as Array<{ name: string; quantity: number; price: string }>;

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-medium">{lead.shopifyOrderName}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#191919]">{lead.customerName}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <X size={20} />
          </button>
        </div>

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Info cliente */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                <span>{lead.customerPhone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{lead.customerAddress}</span>
              </div>
            </div>
          </div>

          {/* Prodotti */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prodotti</h3>
            <div className="space-y-1.5">
              {products.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={12} className="text-gray-400" />
                    <span className="text-gray-700">{p.quantity}× {p.name}</span>
                  </div>
                  <span className="text-gray-500 font-medium">€{p.price}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm font-bold text-[#191919]">Totale: €{lead.totalPrice}</span>
            </div>
          </div>

          {/* Tracking */}
          {lead.trackingCode && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Spedizione</h3>
              <div className="flex items-center gap-2 text-sm bg-purple-50 rounded-lg px-3 py-2">
                <Package size={13} className="text-purple-500" />
                <span className="text-purple-700 font-medium">{lead.trackingCode}</span>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Date</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-gray-400 mb-0.5">Creato il</div>
                <div className="text-gray-700 font-medium">{formatDate(lead.createdAt)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-gray-400 mb-0.5">Confermato il</div>
                <div className="text-gray-700 font-medium">{formatDate(lead.confirmedAt)}</div>
              </div>
              {lead.shippedAt && (
                <div className="bg-purple-50 rounded-lg px-3 py-2">
                  <div className="text-purple-400 mb-0.5">Spedito il</div>
                  <div className="text-purple-700 font-medium">{formatDate(lead.shippedAt)}</div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-gray-400 mb-0.5">Scadenza risposta</div>
                <div className="text-gray-700 font-medium flex items-center gap-1">
                  <Clock size={11} />
                  {formatDate(lead.responseDeadline)}
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FileText size={11} />
              Note
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aggiungi note su questo cliente o ordine..."
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 placeholder-gray-300"
            />
            <button
              onClick={saveNotes}
              disabled={isSaving || notes === (lead.notes ?? "")}
              className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#191919] text-white rounded-lg hover:bg-black disabled:opacity-40 transition-colors"
            >
              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saved ? "Salvato!" : "Salva note"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => { onOpenChat(lead); onClose(); }}
            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            <MessageCircle size={14} />
            Apri Chat WhatsApp
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
