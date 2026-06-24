import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";

let resendInstance: Resend | null = null;
function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

let supabaseInstance: ReturnType<typeof createClient> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): any {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

export async function GET(req: Request) {
  // Secure auth check — fail closed if CRON_SECRET is not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration: CRON_SECRET not set" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Vercel Hobby allows only a once-per-day cron, so this runs as a daily
    // digest: it reminds about anything due within the next 48h. The window is
    // wider than the 24h gap between daily runs so deadlines never slip through,
    // and `reminder_sent` ensures each task is only emailed once.
    const WINDOW_HOURS = 48;

    // Fetch incomplete, not-yet-reminded tasks that have a deadline
    const { data: tasks, error: tasksError } = await getSupabase()
      .from("study_tasks")
      .select("*, profiles(email, full_name)")
      .eq("status", "todo")
      .eq("reminder_sent", false)
      .not("deadline", "is", null);

    if (tasksError) throw tasksError;

    // Fetch user settings to respect daily_summary preference
    const { data: settingsList, error: settingsError } = await getSupabase()
      .from("notification_settings")
      .select("user_id, daily_summary");

    if (settingsError) throw settingsError;

    interface NotificationSettingRow {
      user_id: string;
      daily_summary: boolean;
    }

    const allowedUserIds = new Set(
      ((settingsList ?? []) as unknown as NotificationSettingRow[])
        .filter((s) => s.daily_summary)
        .map((s) => s.user_id)
    );

    const sentEmails = [];

    for (const task of tasks) {
      if (!allowedUserIds.has(task.user_id)) continue;
      const deadline = new Date(task.deadline);
      if (task.due_time) {
        const [h, m] = task.due_time.split(":");
        deadline.setHours(parseInt(h), parseInt(m), 0);
      } else {
        deadline.setHours(23, 59, 59);
      }

      // If the deadline falls within the reminder window
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0 && diffHours <= WINDOW_HOURS) {
        const userEmail = task.profiles?.email;
        if (!userEmail) continue;

        try {
          await getResend().emails.send({
            from: "StudyFlow AI <reminders@studyflow.ai>",
            to: userEmail,
            subject: `Reminder: ${task.title} is due soon`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Don't forget your task!</h2>
                <p>Hi ${task.profiles.full_name || 'Student'},</p>
                <p>This is a friendly reminder that your task <strong>"${task.title}"</strong> for <strong>${task.subject}</strong> is due soon.</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()} ${task.due_time || ''}</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tasks" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold;">Go to Planner</a>
                <p style="font-size: 12px; color: #666; margin-top: 30px;">Keep up the great work! Consistency is key.</p>
              </div>
            `
          });

          // Mark as sent
          await getSupabase()
            .from("study_tasks")
            .update({ reminder_sent: true })
            .eq("id", task.id);
          
          sentEmails.push(task.id);
        } catch (emailErr) {
          console.error(`Failed to send email for task ${task.id}:`, emailErr);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: tasks.length,
      sent: sentEmails.length 
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    console.error("Cron Error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
