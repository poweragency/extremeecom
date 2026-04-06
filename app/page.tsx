"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { EmailView } from "@/components/EmailView";
import { WhatsAppView } from "@/components/WhatsAppView";
import { Sidebar } from "@/components/Sidebar";

type View = "kanban" | "email" | "whatsapp";

export default function Home() {
  const [activeView, setActiveView] = useState<View>("kanban");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        selectedStoreId={selectedStoreId}
        onStoreChange={setSelectedStoreId}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === "kanban" && <KanbanBoard storeId={selectedStoreId} />}
        {activeView === "email" && <EmailView />}
        {activeView === "whatsapp" && <WhatsAppView />}
      </div>
    </div>
  );
}
