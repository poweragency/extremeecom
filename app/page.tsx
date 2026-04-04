"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { EmailView } from "@/components/EmailView";
import { Sidebar } from "@/components/Sidebar";

type View = "kanban" | "email";

export default function Home() {
  const [activeView, setActiveView] = useState<View>("kanban");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === "kanban" && <KanbanBoard />}
        {activeView === "email" && <EmailView />}
      </div>
    </div>
  );
}
