"use client";

import { useState, useEffect } from "react";
import { Mail, Send, RefreshCw, Inbox, ChevronLeft, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  read: boolean;
}

export function EmailView() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });
  const [isSending, setIsSending] = useState(false);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/email/inbox");
      if (res.ok) {
        const data = await res.json() as { emails: Email[]; connected: boolean };
        setEmails(data.emails);
        setIsConnected(data.connected);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const sendEmail = async () => {
    if (!compose.to || !compose.subject || !compose.body) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compose),
      });
      if (res.ok) {
        setIsComposing(false);
        setCompose({ to: "", subject: "", body: "" });
        alert("Email inviata!");
      }
    } finally {
      setIsSending(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <Mail size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Collega il tuo Gmail</h2>
          <p className="text-gray-500 text-sm mb-6">
            Connetti il tuo account Gmail per gestire le email dei clienti direttamente da qui.
          </p>
          <a
            href="/api/email/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Mail size={16} />
            Connetti Gmail
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Lista email */}
      <div className="w-80 border-r bg-white flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Inbox size={16} />
            Inbox
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsComposing(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nuova
            </button>
            <button onClick={loadEmails} className="text-gray-400 hover:text-gray-600">
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Nessuna email
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelected(email)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                  selected?.id === email.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
                } ${!email.read ? "bg-blue-50/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${!email.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {email.from}
                    </div>
                    <div className="text-xs font-medium text-gray-800 truncate mt-0.5">{email.subject}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{email.snippet}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.date)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Dettaglio email / Composizione */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {isComposing ? (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-gray-600">
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-semibold text-gray-900">Nuova email</h3>
            </div>
            <div className="space-y-3 flex-1">
              <input
                type="email"
                placeholder="A: email@esempio.com"
                value={compose.to}
                onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Oggetto"
                value={compose.subject}
                onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Scrivi il messaggio..."
                value={compose.body}
                onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                rows={12}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none flex-1"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={sendEmail}
                disabled={isSending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Invia
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 overflow-y-auto p-6">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
            >
              <ChevronLeft size={16} />
              Indietro
            </button>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{selected.subject}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-4 border-b">
              <span>Da: <span className="text-gray-700">{selected.from}</span></span>
              <span>A: <span className="text-gray-700">{selected.to}</span></span>
              <span>{formatDate(selected.date)}</span>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.body}</div>
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setCompose({ to: selected.from, subject: `Re: ${selected.subject}`, body: "" });
                  setIsComposing(true);
                }}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Send size={14} />
                Rispondi
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Mail size={40} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Seleziona un&apos;email</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
