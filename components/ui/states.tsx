import type { LucideIcon } from "lucide-react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-3xl border border-dashed border-border/60 py-16 px-6 text-center", className)}>
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry, className }: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-3xl border border-red-500/20 py-14 px-6 text-center", className)}>
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:-translate-y-0.5 transition-transform">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}

export function CardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-3xl p-6">
          <Skeleton className="h-6 w-1/3 mb-3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
