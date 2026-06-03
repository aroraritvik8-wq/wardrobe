// Use the OpenAI vision model to accurately re-tag EVERY item from its photo:
// name ("Colour Garment"), category, colour, material, season.
// Run with:  node scripts/retag-vision.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const KEY = env.OPEN_AI_API_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PROMPT = `You are tagging a single clothing item from its photo. Reply with ONLY JSON:
{"name":"...","category":"...","colour":"...","material":"...","season":"..."}
- name: "{Colour} {Garment type}" e.g. "White Sneakers", "Navy Hoodie", "Aqua Dress". Be ACCURATE about both the colour and the garment type you actually see.
- category: exactly one of: top, bottom, shoes, outerwear, dress, accessory
- colour: the main colour as one word (white, black, navy, aqua, beige, red, etc.)
- material: best guess (cotton, denim, leather, wool, polyester, knit...). Always guess.
- season: exactly one of: spring, summer, autumn, winter, all
Include all five keys. No extra text.`;

async function tag(image) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 150,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: image, detail: "low" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI " + res.status);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
}

const { data: items, error } = await supabase
  .from("items").select("id,image_url").limit(2000);
if (error) { console.error(error.message); process.exit(1); }
const withPhotos = items.filter((i) => i.image_url);
console.log(`Vision-tagging ${withPhotos.length} items…`);

let done = 0, failed = 0;
const BATCH = 8;
for (let i = 0; i < withPhotos.length; i += BATCH) {
  await Promise.all(withPhotos.slice(i, i + BATCH).map(async (it) => {
    try {
      const t = await tag(it.image_url);
      const update = {};
      if (t.name) update.name = t.name;
      if (t.category) update.category = t.category;
      if (t.colour) update.colour = t.colour;
      if (t.material) update.material = t.material;
      if (t.season) update.season = t.season;
      if (Object.keys(update).length) await supabase.from("items").update(update).eq("id", it.id);
    } catch { failed++; }
  }));
  done += Math.min(BATCH, withPhotos.length - i);
  if (done % 80 === 0 || done === withPhotos.length) console.log(`  ${done}/${withPhotos.length} (failed: ${failed})`);
}
console.log(`Done. Re-tagged from photos. Failures: ${failed}`);
