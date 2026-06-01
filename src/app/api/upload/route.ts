// POST /api/upload  -> receive a photo file, store it in Supabase Storage,
// and return the public URL. The FILE lives in the storage bucket; only its
// URL gets saved on the item row in the database.

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { BUCKET } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  // The browser sends the file as "form data" (not JSON), so we read it that way.
  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No photo was uploaded." }, { status: 400 });
  }

  // Build a unique file name so two photos never clash.
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ask Supabase for the public web address of the file we just saved.
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
