"use client";

import { useEffect, useState } from "react";

export const ACCENTS = {
  indigo:  { primary: "#4f46e5", ring: "rgba(79,70,229,0.16)",  label: "Indigo" },
  violet:  { primary: "#7c3aed", ring: "rgba(124,58,237,0.16)", label: "Violet" },
  emerald: { primary: "#059669", ring: "rgba(5,150,105,0.16)",  label: "Emerald" },
  rose:    { primary: "#e11d48", ring: "rgba(225,29,72,0.16)",  label: "Rose" },
  amber:   { primary: "#d97706", ring: "rgba(217,119,6,0.16)",  label: "Amber" },
  sky:     { primary: "#0284c7", ring: "rgba(2,132,199,0.16)",  label: "Sky" },
} as const;

export type AccentKey = keyof typeof ACCENTS;

export function applyAccent(key: AccentKey): void {
  if (typeof document === "undefined") return;
  const a = ACCENTS[key] ?? ACCENTS.indigo;
  const root = document.documentElement;
  root.style.setProperty("--primary", a.primary);
  root.style.setProperty("--ring", a.ring);
}

function getInitialAccent(): AccentKey {
  if (typeof window === "undefined") return "indigo";
  const stored = localStorage.getItem("accent");
  return stored && stored in ACCENTS ? (stored as AccentKey) : "indigo";
}

export function useAccent() {
  const [accent, setAccentState] = useState<AccentKey>(getInitialAccent);

  useEffect(() => { applyAccent(accent); }, [accent]);

  const setAccent = (key: AccentKey) => {
    setAccentState(key);
    try { localStorage.setItem("accent", key); } catch { /* ignore */ }
    applyAccent(key);
  };

  return { accent, setAccent };
}
