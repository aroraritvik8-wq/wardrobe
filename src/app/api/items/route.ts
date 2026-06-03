// API routes for the WHOLE list of items.
//   GET  /api/items   -> return all items (with optional filters)
//   POST /api/items   -> add a new item
//
// The frontend pages call these; this file talks to Supabase.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// GET = "read". Return the list of items, newest first.
// Supports optional filters passed as ?category=top&season=summer&q=nike
export async function GET(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(req.url);

  // Select only the display fields — NOT the big "embedding" vector, which
  // would make this response huge and slow.
  let query = supabase
    .from("items")
    .select("id,name,category,colour,material,season,image_url,cutout_url,times_worn,created_at")
    .order("created_at", { ascending: false });

  // Only add each filter if it was actually provided.
  const category = searchParams.get("category");
  if (category) query = query.eq("category", category);

  const season = searchParams.get("season");
  if (season) query = query.eq("season", season);

  const colour = searchParams.get("colour");
  if (colour) query = query.ilike("colour", `%${colour}%`);

  const q = searchParams.get("q");
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST = "create". Add a new item to the database.
export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json();
  const { name, category, colour, material, season, image_url } = body;

  // Friendly validation: don't crash, just say what's missing.
  if (!name || !category) {
    return NextResponse.json(
      { error: "Please give the item a name and a category." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("items")
    .insert({
      name,
      category,
      colour: colour || "",
      season: season || "all",
      image_url: image_url || null,
      material: material || "",
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
