"use client";

import { useState } from "react";
import { Music2, Radio, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOFI_STATIONS } from "@/lib/focus";
import { useFocus } from "./focus-provider";

export function LofiPanel() {
  const { prefs, updatePrefs } = useFocus();
  const [iframeLoading, setIframeLoading] = useState(true);

  const station = LOFI_STATIONS.find((s) => s.id === prefs.lofi_station) ?? LOFI_STATIONS[0];
  const source = prefs.lofi_source;

  const src = source === "youtube"
    ? `https://www.youtube.com/embed/${station.youtubeId}?rel=0`
    : `https://open.spotify.com/embed/playlist/${station.spotifyId}?theme=0`;

  const externalUrl = source === "youtube"
    ? `https://www.youtube.com/watch?v=${station.youtubeId}`
    : `https://open.spotify.com/playlist/${station.spotifyId}`;

  const selectStation = (id: string) => {
    if (id !== prefs.lofi_station) { setIframeLoading(true); void updatePrefs({ lofi_station: id }); }
  };
  const selectSource = (s: "youtube" | "spotify") => {
    if (s !== source) { setIframeLoading(true); void updatePrefs({ lofi_source: s }); }
  };

  return (
    <div className="glass rounded-3xl p-6 border border-border/60">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-base flex items-center gap-2"><Music2 className="h-4 w-4 text-primary" /> Lofi Music</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{station.description}</p>
        </div>
        <div className="inline-flex rounded-xl bg-muted/40 p-1 border border-border/50 shrink-0">
          {(["youtube", "spotify"] as const).map((s) => (
            <button
              key={s}
              onClick={() => selectSource(s)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize transition-colors",
                source === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Station chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {LOFI_STATIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => selectStation(s.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95",
              prefs.lofi_station === s.id
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >{s.label}</button>
        ))}
      </div>

      {/* Player */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted/30" style={{ aspectRatio: source === "youtube" ? "16 / 9" : "auto" }}>
        {iframeLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40 animate-pulse z-10">
            <Radio className="h-8 w-8 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">Loading station…</span>
          </div>
        )}
        <iframe
          key={`${source}-${station.id}`}
          src={src}
          title={`${station.label} lofi`}
          loading="lazy"
          onLoad={() => setIframeLoading(false)}
          className={cn("w-full block", source === "youtube" ? "h-full" : "h-[352px]")}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <ExternalLink className="h-3 w-3" /> Open in {source === "youtube" ? "YouTube" : "Spotify"}
      </a>
    </div>
  );
}
