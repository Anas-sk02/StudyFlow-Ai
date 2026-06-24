"use server";

import { createClient } from "@/supabase/server";
import { revalidatePath } from "next/cache";
import type { Priority, TaskStatus } from "@/lib/types";
import { taskSchema } from "@/lib/validations";

export type ActionResult = {
  data?: unknown;
  error?: string;
};

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be logged in." };
    }

    const rawInput = {
      title: formData.get("title")?.toString() || "",
      subject: formData.get("subject")?.toString() || "",
      description: formData.get("description")?.toString(),
      deadline: formData.get("deadline")?.toString() || undefined,
      due_time: formData.get("due_time")?.toString() || undefined,
      priority: formData.get("priority")?.toString() || "medium",
      estimated_hours: Number(formData.get("estimated_hours") || 1),
      recurrence: formData.get("recurrence")?.toString() || "none",
    };

    const parsed = taskSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || "Validation failed";
      return { error: firstError };
    }

    const payload = {
      user_id: user.id,
      title: parsed.data.title,
      subject: parsed.data.subject,
      description: parsed.data.description || "",
      deadline: parsed.data.deadline || null,
      due_time: parsed.data.due_time || null,
      priority: parsed.data.priority,
      estimated_hours: parsed.data.estimated_hours,
      recurrence: parsed.data.recurrence ?? "none",
      status: "todo" as TaskStatus,
    };

    const { data, error } = await supabase
      .from("study_tasks")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Create task error:", error.message);
      return { error: "Failed to create task. Please try again." };
    }

    revalidatePath("/dashboard/tasks");
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Create task unexpected error:", message);
    return { error: "An unexpected error occurred." };
  }
}

export async function updateTaskAction(taskId: string, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be logged in." };

    const { data: existing, error: fetchErr } = await supabase
      .from("study_tasks").select("id, user_id").eq("id", taskId).single();
    if (fetchErr || !existing) return { error: "Task not found." };
    if (existing.user_id !== user.id) return { error: "Unauthorized." };

    const rawInput = {
      title: formData.get("title")?.toString() || "",
      subject: formData.get("subject")?.toString() || "",
      description: formData.get("description")?.toString(),
      deadline: formData.get("deadline")?.toString() || undefined,
      due_time: formData.get("due_time")?.toString() || undefined,
      priority: formData.get("priority")?.toString() || "medium",
      estimated_hours: Number(formData.get("estimated_hours") || 1),
      recurrence: formData.get("recurrence")?.toString() || "none",
    };

    const parsed = taskSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return { error: Object.values(fieldErrors).flat()[0] || "Validation failed" };
    }

    const patch = {
      title: parsed.data.title,
      subject: parsed.data.subject,
      description: parsed.data.description || "",
      deadline: parsed.data.deadline || null,
      due_time: parsed.data.due_time || null,
      priority: parsed.data.priority,
      estimated_hours: parsed.data.estimated_hours,
      recurrence: parsed.data.recurrence ?? "none",
    };

    const { data, error } = await supabase
      .from("study_tasks").update(patch).eq("id", taskId).select("*").single();
    if (error) {
      console.error("Update task error:", error.message);
      return { error: "Failed to update task." };
    }

    revalidatePath("/dashboard/tasks");
    return { data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Update task error:", message);
    return { error: "An unexpected error occurred." };
  }
}

function shiftDeadline(deadline: string, recurrence: string): string {
  const d = new Date(`${deadline}T00:00:00`);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function toggleTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be logged in." };

    // Fetch the task, verify ownership
    const { data: task, error: fetchErr } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) return { error: "Task not found." };
    if (task.user_id !== user.id) return { error: "Unauthorized." };

    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    const completed_at = nextStatus === "done" ? new Date().toISOString() : null;

    const { error: updateErr } = await supabase
      .from("study_tasks")
      .update({ status: nextStatus, completed_at })
      .eq("id", taskId);

    if (updateErr) {
      console.error("Toggle task error:", updateErr.message);
      return { error: "Failed to update task." };
    }

    // On completing a recurring task, spawn the next occurrence
    let spawned: unknown = null;
    if (nextStatus === "done" && task.recurrence && task.recurrence !== "none" && task.deadline) {
      const { data: next } = await supabase
        .from("study_tasks")
        .insert({
          user_id: user.id,
          title: task.title,
          subject: task.subject,
          description: task.description ?? "",
          deadline: shiftDeadline(task.deadline as string, task.recurrence as string),
          due_time: task.due_time ?? null,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          recurrence: task.recurrence,
          status: "todo" as TaskStatus,
          reminder_sent: false,
        })
        .select("*")
        .single();
      spawned = next ?? null;
    }

    revalidatePath("/dashboard/tasks");
    return { data: { status: nextStatus, completed_at, spawned } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Toggle task error:", message);
    return { error: "An unexpected error occurred." };
  }
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be logged in." };

    // Verify ownership before delete
    const { data: task, error: fetchErr } = await supabase
      .from("study_tasks")
      .select("id, user_id")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) return { error: "Task not found." };
    if (task.user_id !== user.id) return { error: "Unauthorized." };

    const { error } = await supabase.from("study_tasks").delete().eq("id", taskId);
    if (error) {
      console.error("Delete task error:", error.message);
      return { error: "Failed to delete task." };
    }

    revalidatePath("/dashboard/tasks");
    return { data: { id: taskId } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Delete task error:", message);
    return { error: "An unexpected error occurred." };
  }
}

export async function rescheduleTaskAction(taskId: string, days: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be logged in." };

    // Verify ownership
    const { data: task, error: fetchErr } = await supabase
      .from("study_tasks")
      .select("id, user_id")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) return { error: "Task not found." };
    if (task.user_id !== user.id) return { error: "Unauthorized." };

    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    const deadline = newDate.toISOString().split("T")[0];

    const { error } = await supabase.from("study_tasks").update({ deadline }).eq("id", taskId);
    if (error) {
      console.error("Reschedule error:", error.message);
      return { error: "Failed to reschedule task." };
    }

    revalidatePath("/dashboard/tasks");
    return { data: { id: taskId, deadline } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("Reschedule error:", message);
    return { error: "An unexpected error occurred." };
  }
}

export async function checkAndSendEmailRemindersAction(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be logged in." };

    // 1. Check user notification settings first
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("daily_summary")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError.message);
      return { error: "Failed to load notification settings." };
    }

    // If daily summary (email reminders) is disabled, exit early
    if (!settings || !settings.daily_summary) {
      return { data: { sentCount: 0 } };
    }

    // 2. Fetch incomplete, not-yet-reminded tasks for this user
    const { data: tasks, error: tasksError } = await supabase
      .from("study_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "todo")
      .eq("reminder_sent", false)
      .not("deadline", "is", null);

    if (tasksError) {
      console.error("Error fetching tasks for reminders:", tasksError.message);
      return { error: "Failed to fetch tasks." };
    }

    if (!tasks || tasks.length === 0) {
      return { data: { sentCount: 0 } };
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("RESEND_API_KEY is not set. Email reminders skipped.");
      return { data: { sentCount: 0 } };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    const userEmail = user.email;
    if (!userEmail) {
      return { error: "User email not found." };
    }

    const now = new Date();
    const WINDOW_HOURS = 48;
    const sentEmails: string[] = [];

    for (const task of tasks) {
      const deadline = new Date(task.deadline);
      if (task.due_time) {
        const [h, m] = task.due_time.split(":");
        deadline.setHours(parseInt(h), parseInt(m), 0);
      } else {
        deadline.setHours(23, 59, 59);
      }

      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // If due within next 48 hours and not in the past
      if (diffHours > 0 && diffHours <= WINDOW_HOURS) {
        try {
          await resend.emails.send({
            from: "StudyFlow AI <reminders@studyflow.ai>",
            to: userEmail,
            subject: `Reminder: ${task.title} is due soon`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5;">Don't forget your task!</h2>
                <p>Hi ${user.user_metadata?.full_name || 'Student'},</p>
                <p>This is a friendly reminder that your task <strong>"${task.title}"</strong> for <strong>${task.subject}</strong> is due soon.</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()} ${task.due_time || ''}</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/tasks" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold;">Go to Planner</a>
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

    return { data: { sentCount: sentEmails.length } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    console.error("checkAndSendEmailRemindersAction error:", message);
    return { error: "An unexpected error occurred." };
  }
}
