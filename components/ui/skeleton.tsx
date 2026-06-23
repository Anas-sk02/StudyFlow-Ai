import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-muted/60 dark:bg-muted/30",
        className
      )}
    />
  );
}

/** Task card skeleton matching the TaskCard height/shape */
export function TaskCardSkeleton() {
  return (
    <div className="glass rounded-3xl p-5 md:p-7 flex items-center gap-5">
      <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded-lg" />
          <Skeleton className="h-4 w-12 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      </div>
    </div>
  );
}

/** Leaderboard entry skeleton */
export function LeaderboardEntrySkeleton() {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-transparent bg-muted/20">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Dashboard overview loading grid */
export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-72 mt-1" />
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </section>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <section className="glass rounded-2xl p-6 lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-48" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <Skeleton className="h-2 w-2 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </section>
        <section className="glass rounded-2xl p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </section>
      </div>
    </div>
  );
}
