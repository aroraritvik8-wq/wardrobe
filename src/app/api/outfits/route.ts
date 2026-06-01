// API routes for outfits (a saved combination of items).
//   GET  /api/outfits  -> list all outfits, each with its items
//   POST /api/outfits  -> create a new outfit from a list of item ids
//
// This is where the many-to-many "join table" (outfit_items) is used:
// one outfit has many items, and one item can be in many outfits.

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { Item } from "@/lib/types";

// GET = list outfits. We ask Supabase to also pull in the linked items in one
// go using a nested select through the join table.
export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("outfits")
    .select("id, name, created_at, outfit_items ( items (*) )")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reshape the nested result into a tidy { ...outfit, items: [...] } form.
  // Supabase types the nested relation loosely, so we cast through `unknown`
  // and handle the linked item being either a single object or an array.
  type Row = {
    id: number;
    name: string;
    created_at: string;
    outfit_items: { items: Item | Item[] | null }[];
  };

  const outfits = (data as unknown as Row[]).map((o) => ({
    id: o.id,
    name: o.name,
    created_at: o.created_at,
    items: o.outfit_items
      .map((link) => (Array.isArray(link.items) ? link.items[0] : link.items))
      .filter(Boolean) as Item[],
  }));

  return NextResponse.json(outfits);
}

// POST = create an outfit, then link it to each chosen item.
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  const { name, item_ids } = body as { name?: string; item_ids?: number[] };

  if (!name || !item_ids || item_ids.length === 0) {
    return NextResponse.json(
      { error: "Please name the outfit and pick at least one item." },
      { status: 400 }
    );
  }

  // Step 1: create the outfit row.
  const { data: outfit, error: outfitError } = await supabase
    .from("outfits")
    .insert({ name })
    .select()
    .single();

  if (outfitError || !outfit) {
    return NextResponse.json(
      { error: outfitError?.message ?? "Could not create outfit." },
      { status: 500 }
    );
  }

  // Step 2: add one link row per chosen item into the join table.
  const links = item_ids.map((item_id) => ({
    outfit_id: outfit.id,
    item_id,
  }));

  const { error: linkError } = await supabase.from("outfit_items").insert(links);
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json(outfit, { status: 201 });
}
