"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Loader2, Flame, Star, ChevronRight, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileSearchResult } from "@/lib/public-profile";

/**
 * Debounced username/name search box with a search directory style layout.
 * Displays results as beautiful grid cards inline.
 * Clicking a result navigates to that user's public profile at /u/<username>.
 */
export function UserSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch whenever the query changes.
  useEffect(() => {
    const term = query.trim();
    const controller = new AbortController();

    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(-1);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const goToProfile = (result: ProfileSearchResult) => {
    if (!result.username) return;
    setQuery("");
    setResults([]);
    router.push(`/u/${result.username}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      goToProfile(results[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className={cn("w-full space-y-6", className)}>
      {/* Search Input Container */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search students by username or name…"
          style={{ paddingLeft: "3rem", paddingRight: "3rem" }}
          className="w-full bg-background border border-border/60 rounded-2xl py-3.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60 shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-200"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results / States */}
      <div className="animate-fade-in">
        {loading ? (
          /* Skeletons */
          <div className="grid gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 bg-muted/20 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted/50 rounded" />
                  <div className="h-3 w-1/4 bg-muted/30 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-muted/40 rounded-full" />
                  <div className="h-7 w-16 bg-muted/40 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : query.trim().length < 2 ? (
          /* Empty/Welcome State */
          <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border/60 rounded-3xl bg-muted/5">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 animate-bounce duration-1000">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base mb-1">Find Your Study Buddies</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Type a student's username or full name above to see their level, streak, XP, and focus hours.
            </p>
          </div>
        ) : results.length === 0 ? (
          /* No Results State */
          <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border/60 rounded-3xl bg-muted/5 animate-fade-in">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground mb-4">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base mb-1">No students found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We couldn't find any student matching &ldquo;{query}&rdquo;. Check the spelling and try again.
            </p>
          </div>
        ) : (
          /* Results List */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Search Results ({results.length})
              </span>
            </div>
            <div className="grid gap-3">
              {results.map((result, i) => {
                const initial = (result.fullName || result.username || "U")
                  .charAt(0)
                  .toUpperCase();
                const isActive = activeIndex === i;

                return (
                  <button
                    key={result.id}
                    onClick={() => goToProfile(result)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 text-left rounded-2xl border transition-all duration-200 group/card",
                      isActive
                        ? "bg-primary/5 border-primary/30 shadow-md translate-x-1"
                        : "bg-card/40 border-border/60 hover:bg-card hover:border-border hover:shadow-sm"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {result.avatarUrl ? (
                        <Image
                          src={result.avatarUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="rounded-full object-cover w-12 h-12 border-2 border-background shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-base font-bold text-white shadow-sm border-2 border-background">
                          {initial}
                        </div>
                      )}
                    </div>

                    {/* Profile Details */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate group-hover/card:text-primary transition-colors duration-200">
                        {result.username}
                      </p>
                      {result.fullName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.fullName}
                        </p>
                      )}
                      
                      {/* Mobile Stats (only visible on mobile) */}
                      <div className="flex items-center gap-2 mt-1 sm:hidden">
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{result.xp} XP</span>
                        </span>
                        <span className="text-muted-foreground/30 text-[10px]">•</span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                          <Flame className="h-3 w-3 fill-current" />
                          <span>{result.streakDays}d</span>
                        </span>
                      </div>
                    </div>

                    {/* Desktop Stats (only visible on sm and up) */}
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{result.xp} XP</span>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        <Flame className="h-3.5 w-3.5 fill-current animate-pulse" />
                        <span>{result.streakDays}d</span>
                      </div>
                      <div className="p-1 rounded-full bg-muted group-hover/card:bg-primary/10 group-hover/card:text-primary transition-colors duration-200 text-muted-foreground shrink-0">
                        <ChevronRight className="h-4 w-4 transform group-hover/card:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Mobile Chevron (only visible on mobile) */}
                    <div className="sm:hidden text-muted-foreground/60 shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
