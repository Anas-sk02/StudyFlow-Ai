"use client";

import { useState } from "react";
import { MessageSquare, GraduationCap } from "lucide-react";
import { AiChat } from "@/components/ai-chat";
import { QuizGenerator } from "@/components/quiz-generator";

type Tab = "chat" | "quiz";

export default function TutorPage() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    // Fill the dashboard content area exactly so the page itself never scrolls —
    // only the chat's message list scrolls, keeping the composer pinned.
    <div className="flex flex-col h-[calc(100dvh-7rem)] md:h-[calc(100dvh-9rem)]">
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ask AI</h1>
        <p className="text-sm text-muted-foreground">
          Your personal AI tutor — solve doubts, upload a photo, or quiz yourself.
        </p>
      </div>

      {/* Tabs */}
      <div className="shrink-0 mb-4 inline-flex w-fit items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="h-4 w-4" />}>
          Doubt Solver
        </TabButton>
        <TabButton active={tab === "quiz"} onClick={() => setTab("quiz")} icon={<GraduationCap className="h-4 w-4" />}>
          Quiz Me
        </TabButton>
      </div>

      {/* Active panel fills the remaining height */}
      <div className="flex-1 min-h-0">
        {tab === "chat" ? (
          <AiChat />
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar pr-1">
            <QuizGenerator />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
