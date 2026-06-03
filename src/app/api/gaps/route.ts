import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// One shopping result from Serper.
type ShoppingItem = {
  title?: string;
  link?: string;
  source?: string;
  imageUrl?: string;
  price?: string;
};

// Search Google Shopping (via Serper) for products; return up to 3 tidy results.
async function productSearch(query: string) {
  const res = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.shopping as ShoppingItem[] | undefined) ?? []).slice(0, 3).map((it) => ({
    title: it.title ?? "",
    link: it.link ?? "#",
    source: it.source ?? "",
    image: it.imageUrl ?? null,
    price: it.price ?? "",
  }));
}

export async function GET() {
  // 1) Summarise the wardrobe (counts per category + some example names).
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data } = await supabase.from("items").select("name,category").limit(400);
  const items = data ?? [];
  const byCat: Record<string, number> = {};
  for (const it of items) byCat[it.category] = (byCat[it.category] ?? 0) + 1;
  const summary =
    Object.entries(byCat).map(([c, n]) => `${c}: ${n}`).join(", ") +
    ". Examples: " + items.slice(0, 30).map((i) => i.name).join(", ");

  // 2) Ask the AI which staples are missing.
  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `You are a wardrobe stylist. The user's wardrobe: ${summary}.
Identify 4 essential STAPLE items that are missing or under-represented — things a
well-rounded wardrobe should have. Return ONLY JSON:
{"gaps":[{"title":"e.g. White Oxford Shirt","reason":"one short sentence","search":"a shopping search query like men's white oxford shirt"}]}`,
        },
      ],
    }),
  });
  const aiData = await aiRes.json();
  let gaps: { title: string; reason: string; search: string }[] = [];
  try {
    gaps = JSON.parse(aiData.choices?.[0]?.message?.content ?? "{}").gaps ?? [];
  } catch {}

  // 3) For each gap, find products to buy.
  const withProducts = await Promise.all(
    gaps.slice(0, 4).map(async (g) => ({
      ...g,
      products: await productSearch(g.search),
    }))
  );

  return NextResponse.json({ gaps: withProducts });
}
