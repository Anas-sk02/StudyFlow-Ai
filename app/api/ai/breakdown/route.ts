import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = `Break down this study goal into practical tasks.
Return strict JSON as {"tasks": ["...", "..."]}.
Goal: ${body.goal}`;
  const data = await generateJSON<{ tasks: string[] }>(prompt);
  return NextResponse.json(data);
}
