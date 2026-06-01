// API routes for ONE single item, identified by its id in the URL.
//   GET    /api/items/5  -> read item 5's full details
//   PATCH  /api/items/5  -> edit item 5
//   DELETE /api/items/5  -> delete item 5
//
// In Next.js 16 the `params` value arrives as a Promise, so we `await` it.

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Context = { params: Promise<{ id: string }> };

// GET = read one item.
export async function GET(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }
  return NextResponse.json(data);
}

// PATCH = update some fields of one item.
export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const supabase = getSupabase();
  const body = await req.json();

  const { name, category, colour, season, image_url } = body;
  if (!name || !category) {
    return NextResponse.json(
      { error: "Please give the item a name and a category." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("items")
    .update({ name, category, colour, season, image_url })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// DELETE = remove one item.
export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const supabase = getSupabase();

  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
