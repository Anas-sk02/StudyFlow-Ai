import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateJSON } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";
import pdf from "pdf-parse/lib/pdf-parse";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_TEXT_LENGTH = 15000;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const formData = await req.formData();
    const textInput = formData.get("text") as string;
    const file = formData.get("file") as File | null;

    let studyText = "";

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "File size exceeds 15MB limit." }, { status: 400 });
      }
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdf(buffer);
      studyText = pdfData.text || "";
    } else if (textInput) {
      studyText = textInput;
    }

    if (!studyText.trim()) {
      return NextResponse.json({ error: "No study material provided." }, { status: 400 });
    }

    const sanitizedText = studyText.slice(0, MAX_TEXT_LENGTH);

    const prompt = `
Generate 6 detailed study flashcards (questions/answers) based on the following material.
Focus on key definitions, core concepts, and active recall cues.
Format the output as a JSON object containing a "flashcards" array where each object has:
- "question": string (the question or front of card)
- "answer": string (the detailed answer or back of card)

Material:
${sanitizedText}
`;

    const result = await generateJSON<{ flashcards: Array<{ question: string; answer: string }> }>(
      prompt,
      {
        flashcards: [
          { question: "What is Active Recall?", answer: "A learning principle where you test your memory rather than passively reading information." },
          { question: "What is the Pomodoro Technique?", answer: "A time management system that breaks work into 25-minute intervals separated by short breaks." }
        ]
      }
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate flashcards.";
    console.error("Flashcard generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
