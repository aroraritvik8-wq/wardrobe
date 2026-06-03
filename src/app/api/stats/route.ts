import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // 1) Get every item.
  const { data, error } = await supabase.from("items").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const items = (data ?? []) as Item[];

  // 2) Simple totals.
  const totalItems = items.length;
  const totalWears = items.reduce((sum, it) => sum + (it.times_worn ?? 0), 0);
  const neverWorn = items.filter((it) => (it.times_worn ?? 0) === 0).length;

  // 3) Count how many items are in each category.
  const byCategory: Record<string, number> = {};
  for (const it of items) {
    byCategory[it.category] = (byCategory[it.category] ?? 0) + 1;
  }

  // 4) The 5 most-worn items.
  const mostWorn = [...items]
    .sort((a, b) => (b.times_worn ?? 0) - (a.times_worn ?? 0))
    .slice(0, 5)
    .map((it) => ({ id: it.id, name: it.name, times_worn: it.times_worn, image_url: it.image_url }));

  // 5) How many outfits exist (just the count, not the rows).
  const { count: outfitCount } = await supabase
    .from("outfits")
    .select("*", { count: "exact", head: true });

  // 6) Send it all back as JSON.
  return NextResponse.json({
    totalItems,
    totalWears,
    neverWorn,
    byCategory,
    mostWorn,
    outfitCount: outfitCount ?? 0,
  });
}