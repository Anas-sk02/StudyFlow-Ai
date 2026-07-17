import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTextStream, type ChatMessage } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1)
    .max(30),
  // Optional image as a data URL ("data:image/png;base64,...") for the doubt solver.
  image: z.string().startsWith("data:image/").max(8_000_000).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Keep only the most recent turns to stay within free-tier token limits.
  const messages: ChatMessage[] = parsed.messages.slice(-12);
  const image = parsed.image;

  // Stream the reply as Server-Sent Events so the UI can render text as it
  // arrives (ChatGPT-style) instead of waiting for the whole answer.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        for await (const chunk of generateTextStream(messages, image)) {
          send({ text: chunk });
        }
        send({ done: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "AI is unavailable right now.";
        console.error("Chat error:", message);
        send({ error: "AI is busy right now (all free quotas hit). Please try again in a moment." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
