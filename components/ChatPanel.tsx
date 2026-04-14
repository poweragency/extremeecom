"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, MessageCircle, Paperclip } from "lucide-react";
import { Lead } from "@/lib/types";

interface Message {
  id: string;
  leadId: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
}

interface ChatPanelProps {
  lead: Lead;
  onClose: () => void;
}

export function ChatPanel({ lead, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carica messaggi
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leads/${lead.id}/messages`);
        if (res.ok) {
          const data = await res.json() as Message[];
          setMessages(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [lead.id]);

  // SSE: ascolta nuovi messaggi
  useEffect(() => {
    const eventSource = new EventSource("/sse");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as {
        type: string;
        leadId?: string;
        message?: Message;
      };
      if (data.type === "message_created" && data.leadId === lead.id && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message!.id)) return prev;
          return [...prev, data.message!];
        });
      }
    };
    return () => eventSource.close();
  }, [lead.id]);

  // Scroll automatico in basso
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isSending) return;
    setIsSending(true);
    setError("");

    try {
      let payload: Record<string, string>;

      if (selectedFile) {
        // Upload file su Meta prima
        const form = new FormData();
        form.append("file", selectedFile);
        const uploadRes = await fetch("/api/media/upload", { method: "POST", body: form });
        if (!uploadRes.ok) {
          const d = await uploadRes.json() as { error: string };
          setError(d.error ?? "Errore upload");
          return;
        }
        const { mediaId, mediaType, fileName } = await uploadRes.json() as {
          mediaId: string; mediaType: string; fileName: string;
        };
        payload = { mediaId, mediaType, fileName };
      } else {
        payload = { body: input.trim() };
      }

      const res = await fetch(`/api/leads/${lead.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setInput("");
        setSelectedFile(null);
      } else {
        const data = await res.json() as { error: string };
        setError(data.error ?? "Errore invio");
      }
    } catch {
      setError("Errore di rete");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l shadow-xl w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-green-600" />
          <div>
            <p className="font-semibold text-sm text-gray-900">{lead.customerName}</p>
            <p className="text-xs text-gray-500">{lead.customerPhone}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center pt-8">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm pt-8">
            Nessun messaggio ancora
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  msg.direction === "outbound"
                    ? "bg-green-500 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-green-100" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {/* Preview file selezionato */}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-600">
            <Paperclip size={12} />
            <span className="flex-1 truncate">{selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {/* Bottone allegato */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setSelectedFile(file); setInput(""); }
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-gray-600 border rounded-xl px-2.5 flex items-center justify-center"
            title="Allega file"
          >
            <Paperclip size={16} />
          </button>

          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setSelectedFile(null); }}
            onKeyDown={handleKeyDown}
            placeholder={selectedFile ? "File pronto, clicca invia" : "Scrivi un messaggio..."}
            rows={2}
            disabled={!!selectedFile}
            className="flex-1 text-sm border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={isSending || (!input.trim() && !selectedFile)}
            className="bg-green-500 text-white rounded-xl px-3 hover:bg-green-600 disabled:opacity-40 transition-colors flex items-center justify-center"
          >
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Invio con Enter · A capo con Shift+Enter · 📎 per allegati</p>
      </div>
    </div>
  );
}
