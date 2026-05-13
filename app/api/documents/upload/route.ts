import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    console.log(`[Upload] Processing PDF upload for user: ${user.id}`);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File size exceeds 10MB limit." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Storage
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${user.id}/${fileName}`;
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, { contentType: "application/pdf", cacheControl: '3600' });

    if (storageError) throw storageError;

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

    // Save to DB (Simplified - No AI processing)
    const { data: doc, error: dbError } = await supabase.from("documents").insert({
      user_id: user.id,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      // AI fields left null
      summary: null,
      topics: [],
      revision_notes: null,
      key_points: []
    }).select().single();

    if (dbError) throw dbError;

    return NextResponse.json(doc);

  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred during upload." 
    }, { status: 500 });
  }
}
