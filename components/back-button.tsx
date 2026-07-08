"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallback?: string;
  label?: string;
}

export function BackButton({ fallback = "/dashboard/profile", label = "Go Back" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there is browser history to go back to.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-all duration-200 py-1.5 px-3 rounded-xl hover:bg-muted/80 border border-border/40 hover:border-border font-medium shadow-sm hover:shadow-none"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
