"use server";

import { createClient } from "@/supabase/server";
import { revalidatePath } from "next/cache";
import type { Priority, TaskStatus } from "@/lib/types";

export type CreateTaskResult = {
  data?: any;
  error?: string;
};

export async function createTaskAction(formData: FormData): Promise<CreateTaskResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "You must be logged in." };
    }

    const title = formData.get("title")?.toString();
    const subject = formData.get("subject")?.toString();
    const description = formData.get("description")?.toString() || "";
    const deadline = formData.get("deadline")?.toString() || null;
    const due_time = formData.get("due_time")?.toString() || null;
    const priority = (formData.get("priority")?.toString() || "medium") as Priority;
    const estimated_hours = Number(formData.get("estimated_hours") || 1);

    if (!title || !subject) {
      return { error: "Title and subject are required." };
    }

    const payload = {
      user_id: user.id,
      title,
      subject,
      description,
      deadline,
      due_time,
      priority,
      estimated_hours,
      status: "todo" as TaskStatus,
    };

    const { data, error } = await supabase
      .from("study_tasks")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard/tasks");
    return { data };
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred." };
  }
}
