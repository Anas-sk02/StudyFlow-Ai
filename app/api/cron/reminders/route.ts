import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass RLS for background jobs
);

export async function GET(req: Request) {
  // Simple auth check for cron jobs (e.g., secret header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const targetTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours from now
    
    // Fetch incomplete tasks with deadlines near the target time
    // We filter for tasks where reminder_sent is false
    const { data: tasks, error: tasksError } = await supabase
      .from("study_tasks")
      .select("*, profiles(email, full_name)")
      .eq("status", "todo")
      .eq("reminder_sent", false)
      .not("deadline", "is", null);

    if (tasksError) throw tasksError;

    const sentEmails = [];

    for (const task of tasks) {
      const deadline = new Date(task.deadline);
      if (task.due_time) {
        const [h, m] = task.due_time.split(":");
        deadline.setHours(parseInt(h), parseInt(m), 0);
      } else {
        deadline.setHours(23, 59, 59);
      }

      // If deadline is within the next 8-9 hours
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0 && diffHours <= 8) {
        const userEmail = task.profiles?.email;
        if (!userEmail) continue;

        try {
          await resend.emails.send({
            from: "StudyFlow AI <reminders@studyflow.ai>",
            to: userEmail,
            subject: `Reminder: ${task.title} is due in 8 hours!`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Don't forget your task!</h2>
                <p>Hi ${task.profiles.full_name || 'Student'},</p>
                <p>This is a friendly reminder that your task <strong>"${task.title}"</strong> for <strong>${task.subject}</strong> is due in 8 hours.</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()} ${task.due_time || ''}</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/tasks" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold;">Go to Planner</a>
                <p style="font-size: 12px; color: #666; margin-top: 30px;">Keep up the great work! Consistency is key.</p>
              </div>
            `
          });

          // Mark as sent
          await supabase
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

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
