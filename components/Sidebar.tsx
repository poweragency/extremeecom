"use client";

import { useState, useEffect } from "react";
import { Store } from "@/lib/types";
import {
  Mail, ChevronDown, ChevronRight, ShoppingBag, Plus,
  LayoutDashboard, MessageCircle, X, Loader2, Store as StoreIcon
} from "lucide-react";

interface SidebarProps {
  activeView: "kanban" | "email" | "whatsapp";
  onViewChange: (view: "kanban" | "email" | "whatsapp") => void;
  selectedStoreId: string | null;
  onStoreChange: (storeId: string | null) => void;
}

export function Sidebar({ activeView, onViewChange, selectedStoreId, onStoreChange }: SidebarProps) {
  const [storeOpen, setStoreOpen] = useState(true);
  const [emailOpen, setEmailOpen] = useState(true);
  const [whatsappOpen, setWhatsappOpen] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadStores = async () => {
    const res = await fetch("/api/stores");
    if (res.ok) setStores(await res.json() as Store[]);
  };

  useEffect(() => { loadStores(); }, []);

  const handleAddStore = async () => {
    if (!formName.trim() || !formDomain.trim() || !formSecret.trim()) {
      setFormError("Tutti i campi sono obbligatori");
      return;
    }
    setIsSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, shopifyDomain: formDomain, webhookSecret: formSecret }),
      });
      if (res.ok) {
        await loadStores();
        setShowModal(false);
        setFormName(""); setFormDomain(""); setFormSecret("");
      } else {
        const data = await res.json() as { error: string };
        setFormError(data.error ?? "Errore");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <aside className="w-56 bg-[#191919] text-gray-300 flex flex-col h-full flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-xs">E</span>
            </div>
            <span className="font-medium text-sm text-white/90">ExtremeEcom</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">

          {/* Dashboard */}
          <button
            onClick={() => onViewChange("kanban")}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
              activeView === "kanban" && selectedStoreId === null
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            }`}
          >
            <LayoutDashboard size={14} className="flex-shrink-0" />
            <span>Tutti gli ordini</span>
          </button>

          {/* STORE */}
          <div className="pt-3">
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              {storeOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <StoreIcon size={11} />
              <span>Store</span>
            </button>

            {storeOpen && (
              <div className="mt-0.5 space-y-0.5">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => { onStoreChange(store.id); onViewChange("kanban"); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                      selectedStoreId === store.id && activeView === "kanban"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    <ShoppingBag size={13} className="flex-shrink-0 text-emerald-400" />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="truncate text-xs font-medium">{store.name}</div>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
                >
                  <Plus size={11} />
                  Aggiungi store
                </button>
              </div>
            )}
          </div>

          {/* WHATSAPP */}
          <div className="pt-3">
            <button
              onClick={() => setWhatsappOpen(!whatsappOpen)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              {whatsappOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <MessageCircle size={11} />
              <span>WhatsApp</span>
            </button>

            {whatsappOpen && (
              <div className="mt-0.5 space-y-0.5">
                <button
                  onClick={() => onViewChange("whatsapp")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    activeView === "whatsapp"
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <MessageCircle size={13} className="flex-shrink-0" />
                  <span className="text-xs">Conversazioni</span>
                </button>
              </div>
            )}
          </div>

          {/* EMAIL */}
          <div className="pt-3">
            <button
              onClick={() => setEmailOpen(!emailOpen)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
            >
              {emailOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <Mail size={11} />
              <span>Email</span>
            </button>

            {emailOpen && (
              <div className="mt-0.5 space-y-0.5">
                <button
                  onClick={() => onViewChange("email")}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    activeView === "email"
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Mail size={13} className="flex-shrink-0" />
                  <span className="text-xs">Inbox</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[10px] text-gray-600">v1.0.0</div>
        </div>
      </aside>

      {/* Modal aggiungi store */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#191919] text-lg">Aggiungi Store</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome store</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="es. Veryra Store"
                  className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Dominio Shopify</label>
                <input
                  type="text"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  placeholder="es. veryraofficial.com"
                  className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Webhook Secret</label>
                <input
                  type="password"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder="Copia da Shopify → Settings → Notifications → Webhooks"
                  className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Trovalo su Shopify Admin → Settings → Notifications → Webhooks → "I tuoi webhook saranno firmati con..."
                </p>
              </div>

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg border border-black/10 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddStore}
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-lg bg-[#191919] text-white text-sm hover:bg-black disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
