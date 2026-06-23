import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

const breakdownSchema = z.object({
  goal: z.string().min(3, "Goal must be at least 3 characters").max(500),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = breakdownSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const prompt = `Break down this study goal into practical tasks.
Return strict JSON as {"tasks": ["...", "..."]}.
Goal: ${parsed.data.goal}`;
    const data = await generateJSON<{ tasks: string[] }>(prompt);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
