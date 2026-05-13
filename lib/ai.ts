import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateJSON<T>(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to your environment variables.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const result = await model.generateContent(`
Return ONLY valid JSON.
Do not add markdown.
Do not add explanation.

${prompt}
`);
const text = result.response
  .text()
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

return JSON.parse(text) as T;
  } catch (error) {
    console.error("Gemini API Error:", error);

    return {
      insights: "AI response temporarily unavailable.",
      motivation: "Keep going, consistency beats motivation.",
    } as T;
  }
}
