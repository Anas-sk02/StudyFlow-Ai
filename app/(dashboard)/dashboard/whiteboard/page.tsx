"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import with SSR disabled to prevent hydration issues and SSR canvas failure
const WhiteboardComponent = dynamic(
  () => import("./WhiteboardClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[80vh] w-full items-center justify-center bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold tracking-wider uppercase font-sans animate-pulse">
            Loading Sketch Studio...
          </p>
        </div>
      </div>
    ),
  }
);

export default function WhiteboardPage() {
  return <WhiteboardComponent />;
}
