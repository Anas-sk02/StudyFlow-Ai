"use client";

import {
  CloudRain, Trees, Coffee, Waves, AudioWaveform, Flame, Moon,
  Volume2, Volume1, VolumeX, Repeat, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AMBIENT_SOUNDS, type AmbientSoundId } from "@/lib/focus";
import { useFocus } from "./focus-provider";

const ICONS: Record<string, LucideIcon> = {
  CloudRain, Trees, Coffee, Waves, AudioWaveform, Flame, Moon,
};

const ACCENT: Record<string, { active: string; idle: string; icon: string }> = {
  sky: { active: "bg-sky-500/15 border-sky-500/40 text-sky-500", idle: "hover:border-sky-500/30", icon: "text-sky-500" },
  emerald: { active: "bg-emerald-500/15 border-emerald-500/40 text-emerald-500", idle: "hover:border-emerald-500/30", icon: "text-emerald-500" },
  amber: { active: "bg-amber-500/15 border-amber-500/40 text-amber-500", idle: "hover:border-amber-500/30", icon: "text-amber-500" },
  cyan: { active: "bg-cyan-500/15 border-cyan-500/40 text-cyan-500", idle: "hover:border-cyan-500/30", icon: "text-cyan-500" },
  slate: { active: "bg-slate-500/15 border-slate-500/40 text-slate-400", idle: "hover:border-slate-500/30", icon: "text-slate-400" },
  orange: { active: "bg-orange-500/15 border-orange-500/40 text-orange-500", idle: "hover:border-orange-500/30", icon: "text-orange-500" },
  indigo: { active: "bg-indigo-500/15 border-indigo-500/40 text-indigo-500", idle: "hover:border-indigo-500/30", icon: "text-indigo-500" },
};

export function AmbientSounds() {
  const { ambient, toggleAmbient, volume, setVolume, prefs, updatePrefs } = useFocus();

  const VolIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="glass rounded-3xl p-6 border border-border/60">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">Ambient Sounds</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Synthesized soundscapes — no download needed</p>
        </div>
        <button
          onClick={() => updatePrefs({ ambient_loop: !prefs.ambient_loop })}
          className={cn(
            "h-8 w-8 rounded-xl border flex items-center justify-center transition-colors",
            prefs.ambient_loop ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60 text-muted-foreground hover:bg-muted",
          )}
          title={prefs.ambient_loop ? "Looping on" : "Looping off"}
        ><Repeat className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {AMBIENT_SOUNDS.map((s) => {
          const Icon = ICONS[s.icon] ?? Waves;
          const accent = ACCENT[s.accent] ?? ACCENT.indigo;
          const active = ambient === (s.id as AmbientSoundId);
          return (
            <button
              key={s.id}
              onClick={() => toggleAmbient(s.id as AmbientSoundId)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-2 rounded-2xl border py-4 px-2 transition-all active:scale-95",
                active ? accent.active : cn("border-border/60 text-muted-foreground hover:text-foreground", accent.idle),
              )}
              title={s.description}
            >
              <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active ? "" : accent.icon)} />
              <span className="text-[11px] font-semibold leading-tight text-center">{s.label}</span>
              {active && <span className="absolute top-2 right-2 flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-current" /></span>}
            </button>
          );
        })}
      </div>

      {/* Volume */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Mute"
        ><VolIcon className="h-4.5 w-4.5" /></button>
        <input
          type="range" min={0} max={1} step={0.01} value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="focus-range flex-1"
          aria-label="Volume"
        />
        <span className="text-xs font-semibold text-muted-foreground w-9 text-right tabular-nums">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
