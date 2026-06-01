// POST /api/items/5/wear  -> add 1 to that item's "times_worn" counter.
// Used by the "Wore it today" button (wear tracking).

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const supabase = getSupabase();

  // Read the current count, add one, then save it back.
  const { data: current, error: readError } = await supabase
    .from("items")
    .select("times_worn")
    .eq("id", id)
    .single();

  if (readError || !current) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("items")
    .update({ times_worn: (current.times_worn ?? 0) + 1 })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
