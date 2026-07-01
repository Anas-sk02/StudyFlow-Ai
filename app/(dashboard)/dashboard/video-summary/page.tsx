"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Video,
  Sparkles,
  BrainCircuit,
  ListChecks,
  BookOpen,
  Target,
  Tag,
  Clock,
  Copy,
} from "lucide-react";

type Section = {
  heading: string;
  timestamp?: string;
  points: string[];
};

type VideoSummary = {
  videoType: string;
  title: string;
  topic: string;
  tldr: string;
  overview: string;
  sections: Section[];
  keyTakeaways: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  actionItems: string[];
  difficulty?: string;
};

export default function VideoSummaryPage() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [summary, setSummary] = useState<VideoSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Paste a YouTube link first.");
      return;
    }

    setIsLoading(true);
    setSummary(null);
    setVideoId(null);

    try {
      const res = await fetch("/api/ai/video-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to summarise the video.");
      }
      setVideoId(data.videoId);
      setSummary(data.summary);
      toast.success("Summary ready!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function copyAll() {
    if (!summary) return;
    const lines: string[] = [];
    lines.push(`# ${summary.title}`, "");
    lines.push(`Type: ${summary.videoType}`);
    if (summary.difficulty) lines.push(`Difficulty: ${summary.difficulty}`);
    lines.push("", `TL;DR: ${summary.tldr}`, "", summary.overview, "");
    for (const s of summary.sections) {
      lines.push(`## ${s.heading}${s.timestamp ? ` (${s.timestamp})` : ""}`);
      s.points.forEach((p) => lines.push(`- ${p}`));
      lines.push("");
    }
    if (summary.keyTakeaways.length) {
      lines.push("## Key Takeaways");
      summary.keyTakeaways.forEach((t) => lines.push(`- ${t}`));
      lines.push("");
    }
    if (summary.keyTerms.length) {
      lines.push("## Key Terms");
      summary.keyTerms.forEach((t) => lines.push(`- ${t.term}: ${t.definition}`));
      lines.push("");
    }
    if (summary.actionItems.length) {
      lines.push("## Action Items");
      summary.actionItems.forEach((a) => lines.push(`- ${a}`));
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Video Summary</h1>
        <p className="text-muted-foreground">
          Paste any YouTube link and get a full, structured breakdown of what the video teaches — adapted to the kind of video it is.
        </p>
      </div>

      {/* Input */}
      <section className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10 group-hover:bg-red-500/10 transition-colors duration-500" />
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">YouTube Video</h2>
            <p className="text-sm text-muted-foreground">
              Works with normal videos, Shorts, and lectures. Public videos only.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm focus:bg-background focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-colors"
          />
          <button
            disabled={isLoading}
            className="shrink-0 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70"
          >
            {isLoading ? (
              <BrainCircuit className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isLoading ? "Watching..." : "Summarise"}
          </button>
        </form>

        {isLoading && (
          <p className="mt-4 text-xs text-muted-foreground animate-pulse">
            The AI is watching the video — longer videos take a little more time.
          </p>
        )}
      </section>

      {summary && (
        <div className="space-y-6 animate-slide-up">
          {/* Video + header */}
          <section className="glass rounded-3xl p-6 md:p-8">
            {videoId && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 bg-black/40">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={summary.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 capitalize">
                {summary.videoType}
              </span>
              {summary.difficulty && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {summary.difficulty}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold tracking-tight">{summary.title}</h2>
            {summary.topic && (
              <p className="text-sm text-muted-foreground mt-1">{summary.topic}</p>
            )}

            <div className="mt-5 p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex gap-3 items-start">
              <Sparkles className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                  TL;DR
                </p>
                <p className="text-sm leading-relaxed">{summary.tldr}</p>
              </div>
            </div>

            {summary.overview && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {summary.overview}
              </p>
            )}

            <button
              onClick={copyAll}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              <Copy className="h-4 w-4" /> Copy summary
            </button>
          </section>

          {/* Adaptive sections */}
          {summary.sections.length > 0 && (
            <section className="glass rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" /> What the video covers
              </h3>
              <div className="space-y-4">
                {summary.sections.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/50 bg-background/30 p-5"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold leading-snug">{s.heading}</h4>
                        {s.timestamp && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" /> {s.timestamp}
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-2 pl-10">
                      {s.points.map((p, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                          <span className="text-muted-foreground">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Key takeaways */}
            {summary.keyTakeaways.length > 0 && (
              <section className="glass rounded-3xl p-6 md:p-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-500" /> Key Takeaways
                </h3>
                <ul className="space-y-2.5">
                  {summary.keyTakeaways.map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Action items */}
            {summary.actionItems.length > 0 && (
              <section className="glass rounded-3xl p-6 md:p-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-500" /> Action Items
                </h3>
                <ul className="space-y-2.5">
                  {summary.actionItems.map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Key terms */}
          {summary.keyTerms.length > 0 && (
            <section className="glass rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-500" /> Key Terms
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {summary.keyTerms.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/50 bg-background/30 p-4"
                  >
                    <p className="font-semibold text-sm mb-1">{t.term}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t.definition}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
