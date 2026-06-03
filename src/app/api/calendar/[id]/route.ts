import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

// DELETE /api/calendar/5  -> remove one calendar entry
export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { error } = await supabase.from("calendar_entries").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
