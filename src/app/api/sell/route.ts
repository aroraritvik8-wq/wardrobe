// GET  /api/sell        -> all your items, with for_sale + price (the page splits them)
// POST /api/sell        -> list an item ({item_id, price}) or unlist it ({item_id, unlist:true})
//
// RLS makes sure you can only ever read/change your OWN items.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("items")
    .select("id,name,category,colour,image_url,cutout_url,for_sale,price,created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { item_id, price, unlist } = await req.json();
  if (!item_id) {
    return NextResponse.json({ error: "item_id is required." }, { status: 400 });
  }

  const update = unlist
    ? { for_sale: false }
    : { for_sale: true, price: price === "" || price == null ? null : Number(price) };

  const { data, error } = await supabase
    .from("items")
    .update(update)
    .eq("id", item_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
