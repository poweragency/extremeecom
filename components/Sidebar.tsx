"use client";

import { useState } from "react";
import { Store, Mail, ChevronDown, ChevronRight, ShoppingBag, Plus, LayoutDashboard } from "lucide-react";

interface SidebarProps {
  activeView: "kanban" | "email";
  onViewChange: (view: "kanban" | "email") => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [storeOpen, setStoreOpen] = useState(true);
  const [emailOpen, setEmailOpen] = useState(true);

  return (
    <aside className="w-56 bg-gray-900 text-gray-100 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">E</span>
          </div>
          <span className="font-bold text-sm text-white">ExtremeEcom</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">

        {/* Dashboard */}
        <button
          onClick={() => onViewChange("kanban")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeView === "kanban"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <LayoutDashboard size={15} />
          <span>Dashboard</span>
        </button>

        {/* STORE */}
        <div>
          <button
            onClick={() => setStoreOpen(!storeOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
          >
            {storeOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Store size={12} />
            <span>Store</span>
          </button>

          {storeOpen && (
            <div className="ml-3 mt-1 space-y-0.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-sm text-white">
                <ShoppingBag size={13} className="text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-medium">ExtremeEcom</div>
                  <div className="text-xs text-green-400">● Connesso</div>
                </div>
              </div>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <Plus size={11} />
                Aggiungi store
              </button>
            </div>
          )}
        </div>

        {/* CUSTOMER SERVICES */}
        <div>
          <button
            onClick={() => setEmailOpen(!emailOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
          >
            {emailOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Mail size={12} />
            <span>Customer Services</span>
          </button>

          {emailOpen && (
            <div className="ml-3 mt-1 space-y-0.5">
              <button
                onClick={() => onViewChange("email")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeView === "email"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Mail size={13} />
                <span className="text-xs">Inbox Email</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700">
        <div className="text-xs text-gray-500">v1.0.0</div>
      </div>
    </aside>
  );
}
