import { NextResponse } from "next/server";
import { z } from "zod";
import { generateVideoSummary, extractYouTubeId } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

// Summarising a video is slower than a text prompt — give Gemini room to watch.
export const maxDuration = 120;

const bodySchema = z.object({
  url: z.string().trim().min(1, "URL is required"),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const videoId = extractYouTubeId(parsed.data.url);
  if (!videoId) {
    return NextResponse.json(
      { error: "That doesn't look like a valid YouTube link." },
      { status: 400 }
    );
  }

  // Normalise to a canonical watch URL before handing it to the model.
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const summary = await generateVideoSummary(canonicalUrl);
    return NextResponse.json({ videoId, summary });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to summarise the video.";
    console.error("Video summary error:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
