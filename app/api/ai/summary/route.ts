import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

const summarySchema = z.object({
  completedTasks: z.number().int().min(0),
  focusedHours: z.number().min(0),
  streak: z.number().int().min(0),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = summarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { completedTasks, focusedHours, streak } = parsed.data;
    const prompt = `Generate concise daily productivity insights and motivation based on these real stats:
- Completed tasks: ${completedTasks}
- Focused hours: ${focusedHours}
- Study streak: ${streak} days
Return strict JSON with {"insights": string, "motivation": string}.
Make the insights specific and data-driven, not generic.`;
    const data = await generateJSON<{ insights: string; motivation: string }>(prompt);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
