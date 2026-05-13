import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = `Generate concise daily productivity insights and motivation.
Return strict JSON with {"insights": string, "motivation": string}.
Data: ${JSON.stringify(body)}`;
  const data = await generateJSON<{ insights: string; motivation: string }>(prompt);
  return NextResponse.json(data);
}
