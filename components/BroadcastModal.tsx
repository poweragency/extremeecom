"use client";

import { useState } from "react";
import { X, Send, Loader2, CheckCheck } from "lucide-react";
import { Lead, COLUMN_CONFIG, LeadStatus } from "@/lib/types";

interface BroadcastModalProps {
  status: LeadStatus;
  leads: Lead[];
  storeId: string | null;
  onClose: () => void;
}

export function BroadcastModal({ status, leads, storeId, onClose }: BroadcastModalProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const config = COLUMN_CONFIG[status];

  const send = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, message: message.trim(), storeId }),
      });
      const data = await res.json() as { sent: number; failed: number; total: number };
      setResult(data);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <CheckCheck size={18} className="text-emerald-500" />
            <div>
              <h2 className="font-bold text-[#191919] text-base">Messaggio a tutti</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className={`font-medium ${config.color}`}>{config.label}</span>
                {" · "}{leads.length} destinatar{leads.length === 1 ? "io" : "i"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          {!result ? (
            <>
              {/* Lista destinatari */}
              <div className="mb-4 max-h-28 overflow-y-auto space-y-1">
                {leads.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span className="font-medium text-gray-700">{l.customerName}</span>
                    <span className="text-gray-400">{l.customerPhone}</span>
                  </div>
                ))}
              </div>

              {/* Campo messaggio */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi il messaggio da inviare a tutti..."
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 placeholder-gray-300"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 text-sm py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={send}
                  disabled={!message.trim() || isSending}
                  className="flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors font-medium"
                >
                  {isSending ? (
                    <><Loader2 size={14} className="animate-spin" /> Invio in corso...</>
                  ) : (
                    <><Send size={14} /> Invia a {leads.length} clienti</>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Risultato */
            <div className="text-center py-4">
              <div className="text-4xl mb-3">{result.failed === 0 ? "✅" : "⚠️"}</div>
              <p className="font-semibold text-[#191919] text-base mb-1">
                {result.sent} / {result.total} messaggi inviati
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-red-500">{result.failed} falliti</p>
              )}
              <button
                onClick={onClose}
                className="mt-5 text-sm px-6 py-2.5 rounded-xl bg-[#191919] text-white hover:bg-black transition-colors"
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
