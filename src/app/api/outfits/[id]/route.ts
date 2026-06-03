// DELETE /api/outfits/5  -> delete one outfit.
// The matching rows in the join table are removed automatically because the
// foreign key is set to "on delete cascade" in the SQL setup.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
