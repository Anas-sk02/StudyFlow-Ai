import { Skeleton } from "@/components/ui/skeleton";

export function FocusHubSkeleton() {
  return (
    <div className="space-y-8 pb-16">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5">
            <Skeleton className="h-9 w-9 rounded-xl mb-3" />
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 glass rounded-3xl p-8 flex flex-col items-center gap-6">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-64 w-64 rounded-full" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <div className="glass rounded-3xl p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
          </div>
          <div className="glass rounded-3xl p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
