import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";
import pdf from "pdf-parse/lib/pdf-parse";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_TEXT_LENGTH = 15000;

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  topic: string;
  explanation: string;
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const formData = await req.formData();
    const textInput = formData.get("text") as string;
    const file = formData.get("file") as File | null;
    const count = Math.min(Math.max(Number(formData.get("count") || 5), 3), 10);

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
Create a multiple-choice quiz with exactly ${count} questions based on the study material below.
Each question must test understanding, not trivial wording.
Return a JSON object with a "questions" array. Each item must have:
- "question": string
- "options": array of exactly 4 distinct strings
- "correctIndex": integer 0-3 (index of the correct option)
- "topic": string (a short 1-3 word topic label for grouping weak areas)
- "explanation": string (one short sentence on why the answer is correct)

Material:
${sanitizedText}
`;

    const result = await generateJSON<{ questions: QuizQuestion[] }>(prompt, {
      questions: [
        {
          question: "What is the most effective way to test memory while studying?",
          options: ["Re-reading notes", "Active recall", "Highlighting", "Listening to music"],
          correctIndex: 1,
          topic: "Study Skills",
          explanation: "Active recall forces retrieval, which strengthens long-term memory.",
        },
        {
          question: "Spaced repetition primarily improves which of the following?",
          options: ["Typing speed", "Long-term retention", "Reading speed", "Note length"],
          correctIndex: 1,
          topic: "Memory",
          explanation: "Reviewing at increasing intervals fights the forgetting curve.",
        },
      ],
    });

    // Defensive sanitisation so the UI always receives valid shapes.
    const questions = (result.questions || [])
      .filter((q) => q && Array.isArray(q.options) && q.options.length >= 2)
      .map((q) => ({
        question: String(q.question || "Untitled question"),
        options: q.options.slice(0, 4).map(String),
        correctIndex:
          typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < q.options.length
            ? q.correctIndex
            : 0,
        topic: String(q.topic || "General"),
        explanation: String(q.explanation || ""),
      }));

    if (questions.length === 0) {
      return NextResponse.json({ error: "Could not build a quiz from this material." }, { status: 422 });
    }

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz.";
    console.error("Quiz generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
