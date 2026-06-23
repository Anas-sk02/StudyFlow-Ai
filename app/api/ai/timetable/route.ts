import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

const timetableSchema = z.object({
  subjects: z.array(z.string()).min(1, "At least one subject is required"),
  availableHours: z.number().min(1).max(16),
  examDates: z.string().max(500),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = timetableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { subjects, availableHours, examDates } = parsed.data;
    const prompt = `You are an expert study strategist.
Return strict JSON with key "schedule" as array of objects: {day, slots:[{subject, task, hours}]}.
Input:
subjects=${JSON.stringify(subjects)}
availableHours=${availableHours}
examDates=${JSON.stringify(examDates)}
`;
    const data = await generateJSON<{ schedule: Array<{ day: string; slots: Array<{ subject: string; task: string; hours: number }> }> }>(
      prompt,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
