import type { StudyTask } from "@/lib/types";

export function buildAnalytics(tasks: StudyTask[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const estimatedHours = tasks.reduce((sum, task) => sum + Number(task.estimated_hours || 0), 0);

  return { total, completed, completionRate, estimatedHours };
}
