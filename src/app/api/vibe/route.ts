import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { query, gender } = await req.json();
  if (!query) return NextResponse.json({ error: "Type a vibe." }, { status: 400 });

  // 1) Turn the search phrase into a vector (same model used for the items).
  const emRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
  });
  const emData = await emRes.json();
  const embedding = emData.data?.[0]?.embedding;
  if (!embedding) {
    return NextResponse.json({ error: "Couldn't understand that search." }, { status: 500 });
  }

  // 2) Ask the database for the items whose vectors are nearest to it.
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // Pull a bigger pool of nearest matches…
  const { data, error } = await supabase.rpc("search_items_by_vibe", {
    query_embedding: JSON.stringify(embedding),
    match_count: 60,
    gender_filter: gender && gender !== "all" ? gender : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // …then keep only the best few PER CATEGORY, so results are a varied mix
  // (tops, bottoms, shoes, accessories) instead of all one type.
  const PER_CATEGORY = 3;
  const counts: Record<string, number> = {};
  const mixed: typeof data = [];
  for (const it of data ?? []) {
    const c = it.category ?? "other";
    counts[c] = counts[c] ?? 0;
    if (counts[c] < PER_CATEGORY) {
      mixed.push(it);
      counts[c]++;
    }
    if (mixed.length >= 16) break;
  }

  return NextResponse.json(mixed);
}
