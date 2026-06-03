import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// GET /api/calendar?month=2026-06  → all entries in that month
export async function GET(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const month = new URL(req.url).searchParams.get("month"); // "2026-06"
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("calendar_entries")
    .select("id, date, planned, item_id, items ( name, image_url )")
    .gte("date", start)
    .lt("date", end)
    .order("date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/calendar  → add one item to one day
export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { date, item_id, planned } = await req.json();
  if (!date || !item_id) {
    return NextResponse.json({ error: "date and item_id required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("calendar_entries")
    .insert({ date, item_id, planned: !!planned, user_id: user.id })
    .select("id, date, planned, item_id, items ( name, image_url )")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}