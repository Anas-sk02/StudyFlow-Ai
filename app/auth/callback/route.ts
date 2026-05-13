import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  // We strictly enforce OTP verification via the UI only.
  // Magic links / Clickable links are disabled for security.
  console.log("Blocking magic link callback attempt.");
  return NextResponse.redirect(`${origin}/login?error=Magic links are disabled. Please use the OTP code sent to your email.`);
}
