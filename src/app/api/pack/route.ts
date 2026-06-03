import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

const MODEL = "gpt-4o-mini";

export async function POST(req: Request) {
  const { trip } = await req.json();
  if (!trip) return NextResponse.json({ error: "Describe your trip." }, { status: 400 });

  // 1) Load the wardrobe (each item has an id the AI can refer to).
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data } = await supabase
    .from("items")
    .select("id,name,category,colour,season,material,image_url,cutout_url,mannequin_ok")
    .limit(600);
  const items = data ?? [];
  const list = items
    .map((i) => `#${i.id} ${i.name} (${i.category}, ${i.colour}, ${i.season}${i.material ? ", " + i.material : ""})`)
    .join("\n");

  // 2) Tell the AI the job + the wardrobe.
  const system = `You are an expert packing assistant.

The user owns these clothes. Each line is: #id Name (category, colour, season-suitability, material).
${list}

Do this in order:
1. From the trip, infer the WEATHER: HOT, MILD, or COLD, and likely WET or dry. Use real knowledge of the destination and time of year (e.g. Dubai in summer = very hot; Melbourne in winter = cold and often wet).
2. Choose items FROM THE LIST that suit that weather:
   - HOT: light, breathable — t-shirts, shorts, dresses, sandals, caps, sunglasses. AVOID hoodies, sweaters, coats, boots, scarves.
   - COLD: warm layers — hoodies, sweaters, jackets/coats, jeans/trousers, boots, and a beanie/scarf if owned.
   - MILD: a mix with light layers.
   - WET: also include a jacket or coat.
   Judge mainly by each item's TYPE (from its name) and its season tag.
3. Pack a realistic amount for the trip length: roughly one top per day, 1-2 bottoms, 1-2 pairs of shoes, plus any needed outerwear and a couple of accessories.

Return ONLY JSON:
{"summary":"1-2 sentences: the weather you expect and your packing approach","itemIds":[ids you recommend],"missing":["useful items for THIS weather they don't own"]}`;

  // 3) Call OpenAI.
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPEN_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: trip },
      ],
    }),
  });

  const aiData = await res.json();
  let parsed: { summary?: string; itemIds?: number[]; missing?: string[] } = {};
  try { parsed = JSON.parse(aiData.choices?.[0]?.message?.content ?? "{}"); } catch {}

  // 4) Turn the chosen ids back into full items (so the page can show photos).
  const byId = new Map(items.map((i) => [i.id, i]));
  const packed = (parsed.itemIds ?? []).map((id) => byId.get(id)).filter(Boolean);

  return NextResponse.json({
    summary: parsed.summary ?? "",
    items: packed,
    missing: parsed.missing ?? [],
  });
}