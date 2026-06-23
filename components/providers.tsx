"use client";

import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
      <Toaster richColors position="top-right" />
    </ErrorBoundary>
  );
}
