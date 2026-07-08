import { NextResponse } from "next/server";
import { searchProfiles } from "@/lib/public-profile";

/**
 * GET /api/users/search?q=<term>
 * Returns public profiles matching the term by username or full name.
 * Public data only (no email) — profiles are already world-readable via RLS.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";

    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchProfiles(query, 8);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("User search failed", error);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}
