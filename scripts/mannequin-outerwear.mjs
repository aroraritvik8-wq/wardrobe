// Rescue outerwear for the mannequin pool: hoodies, coats, blazers and suit
// jackets are all valid "jacket on top" items. Processes outerwear that was
// never cut out, keeps the clean ones, removes their background, marks ready.
// Run with:  node scripts/mannequin-outerwear.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { removeBackground } from "@imgly/background-removal-node";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BUCKET = "wardrobe";
const KEY = env.OPEN_AI_API_KEY;

async function jacketOk(imageUrl) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 3,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "This photo is for an outfit display. Reply YES if it shows a single piece of outerwear " +
                "(jacket, coat, hoodie, blazer or suit jacket) shown front-on or hanging on a plain background. " +
                "Reply NO if it is folded, worn by a visible person, multiple products, a zoomed-in detail, or " +
                "has a busy/cluttered background. Reply ONLY 'yes' or 'no'.",
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI " + res.status);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").toLowerCase().includes("yes");
}

async function makeCutout(id, imageUrl) {
  const blob = await removeBackground(imageUrl);
  const buffer = Buffer.from(await blob.arrayBuffer());
  const path = `cutouts/${id}.png`;
  const up = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (up.error) throw up.error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const { data: items, error } = await supabase
  .from("items")
  .select("id,name,image_url")
  .eq("category", "outerwear")
  .is("cutout_url", null)
  .not("image_url", "is", null);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Checking ${items.length} outerwear photos…`);

let added = 0, skipped = 0, failed = 0;
for (const it of items) {
  try {
    if (await jacketOk(it.image_url)) {
      const cutout_url = await makeCutout(it.id, it.image_url);
      await supabase.from("items").update({ mannequin_ok: true, cutout_url }).eq("id", it.id);
      added++;
      console.log("  + " + it.name);
    } else {
      await supabase.from("items").update({ mannequin_ok: false }).eq("id", it.id);
      skipped++;
    }
  } catch (e) {
    failed++;
    console.error("  fail", it.id, e.message);
  }
}
console.log(`\nDone. Outerwear added: ${added}, skipped: ${skipped}, failed: ${failed}`);
