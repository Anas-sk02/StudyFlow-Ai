import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}
