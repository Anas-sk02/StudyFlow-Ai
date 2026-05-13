"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
      }}
      className="rounded-xl border px-3 py-2 text-sm hover:bg-white/50 dark:hover:bg-white/5"
    >
      Logout
    </button>
  );
}
