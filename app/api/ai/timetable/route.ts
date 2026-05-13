import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = `You are an expert study strategist.
Return strict JSON with key "schedule" as array of objects: {day, slots:[{subject, task, hours}]}.
Input:
subjects=${JSON.stringify(body.subjects)}
availableHours=${body.availableHours}
examDates=${JSON.stringify(body.examDates)}
`;
  const data = await generateJSON<{ schedule: Array<{ day: string; slots: Array<{ subject: string; task: string; hours: number }> }> }>(
    prompt,
  );
  return NextResponse.json(data);
}
