"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const email = String(formData.get("email") || "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent.");
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-6">
        <h1 className="text-xl font-semibold">Reset password</h1>
        <form action={onSubmit} className="mt-4 space-y-3">
          <input name="email" type="email" required className="w-full rounded-xl border px-3 py-2" placeholder="Email" />
          <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-2 text-white">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
