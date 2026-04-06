"use client";

import { useState, useEffect, useRef } from "react";
import { Lead } from "@/lib/types";
import { Loader2, Send, Search, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  leadId: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
}

export function WhatsAppView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/leads");
        if (res.ok) setLeads(await res.json() as Lead[]);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedLead) return;
    const load = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/leads/${selectedLead.id}/messages`);
        if (res.ok) setMessages(await res.json() as Message[]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    load();
  }, [selectedLead]);

  useEffect(() => {
    const eventSource = new EventSource("/sse");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        leadId?: string;
        message?: Message;
        lead?: Lead;
      };
      if (data.type === "message_created" && data.message) {
        if (selectedLead && data.leadId === selectedLead.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message!.id)) return prev;
            return [...prev, data.message!];
          });
        }
        setLeads((prev) => prev.map((l) =>
          l.id === data.leadId ? { ...l, updatedAt: new Date().toISOString() } : l
        ));
      }
      if (data.type === "lead_created" && data.lead) {
        setLeads((prev) => {
          if (prev.some((l) => l.id === data.lead!.id)) return prev;
          return [data.lead!, ...prev];
        });
      }
      if (data.type === "lead_updated" && data.lead) {
        setLeads((prev) => prev.map((l) => l.id === data.lead!.id ? data.lead! : l));
        if (selectedLead?.id === data.lead.id) setSelectedLead(data.lead);
      }
    };
    return () => eventSource.close();
  }, [selectedLead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isSending || !selectedLead) return;
    setIsSending(true);
    try {
      await fetch(`/api/leads/${selectedLead.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: input.trim() }),
      });
      setInput("");
    } finally {
      setIsSending(false);
    }
  };

  const statusDot: Record<string, string> = {
    PENDING: "bg-blue-400",
    CONFIRMED: "bg-emerald-400",
    NO_RESPONSE: "bg-amber-400",
    REJECTED: "bg-red-400",
  };

  const statusLabel: Record<string, string> = {
    PENDING: "In attesa",
    CONFIRMED: "Confermato",
    NO_RESPONSE: "No risposta",
    REJECTED: "Rifiutato",
  };

  const filteredLeads = leads.filter((l) =>
    l.customerName.toLowerCase().includes(search.toLowerCase()) ||
    l.customerPhone.includes(search) ||
    l.shopifyOrderName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#f7f7f5]">
      {/* Lista conversazioni */}
      <div className="w-72 bg-white border-r border-black/[0.06] flex flex-col flex-shrink-0">
        <div className="px-4 pt-6 pb-3 border-b border-black/5">
          <h2 className="font-bold text-[#191919] text-lg mb-3">WhatsApp</h2>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              placeholder="Cerca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-black/[0.03] border border-black/[0.06] rounded-md focus:outline-none focus:ring-1 focus:ring-black/10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingLeads ? (
            <div className="flex justify-center pt-8">
              <Loader2 size={18} className="animate-spin text-gray-300" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center text-gray-300 text-sm pt-8">Nessuna conversazione</div>
          ) : (
            filteredLeads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full px-4 py-3 text-left border-b border-black/[0.04] hover:bg-black/[0.02] transition-colors ${
                  selectedLead?.id === lead.id ? "bg-black/[0.04]" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[lead.status]}`} />
                  <span className="font-medium text-sm text-[#191919] truncate flex-1">{lead.customerName}</span>
                  <span className="text-[11px] text-gray-400">{lead.shopifyOrderName}</span>
                </div>
                <div className="pl-3.5 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{lead.customerPhone}</span>
                  <span className="text-xs font-medium text-gray-400">€{lead.totalPrice}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Area chat */}
      {selectedLead ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-black/[0.06] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center flex-shrink-0">
              <span className="text-[#191919] font-semibold text-sm">
                {selectedLead.customerName[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#191919] text-sm">{selectedLead.customerName}</p>
              <p className="text-xs text-gray-400">{selectedLead.customerPhone} · {selectedLead.shopifyOrderName} · €{selectedLead.totalPrice}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[selectedLead.status]}`} />
              <span className="text-xs text-gray-500">{statusLabel[selectedLead.status]}</span>
            </div>
          </div>

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {isLoadingMessages ? (
              <div className="flex justify-center pt-8">
                <Loader2 size={18} className="animate-spin text-gray-300" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-300 text-sm pt-12">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
                Nessun messaggio ancora
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[60%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.direction === "outbound"
                      ? "bg-[#191919] text-white rounded-br-sm"
                      : "bg-white border border-black/[0.06] text-[#191919] rounded-bl-sm shadow-sm"
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${msg.direction === "outbound" ? "text-white/40" : "text-gray-300"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-black/[0.06] bg-white px-6 py-4">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                placeholder="Scrivi un messaggio..."
                rows={2}
                className="flex-1 text-sm bg-black/[0.03] border border-black/[0.06] rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-black/10"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || !input.trim()}
                className="bg-[#191919] text-white rounded-xl px-4 py-2.5 hover:bg-black disabled:opacity-30 transition-colors flex items-center justify-center h-[42px]"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-gray-300 mt-1.5">Enter per inviare · Shift+Enter per andare a capo</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-300">
            <MessageCircle size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Seleziona una conversazione</p>
          </div>
        </div>
      )}
    </div>
  );
}
