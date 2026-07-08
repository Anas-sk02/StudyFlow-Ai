import Link from "next/link";
import { UserX } from "lucide-react";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <UserX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Student not found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find a profile with that username. It may have been
          changed, or the link might be incorrect.
        </p>
        <Link
          href="/dashboard/leaderboard"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
        >
          Explore the leaderboard
        </Link>
      </div>
    </div>
  );
}
