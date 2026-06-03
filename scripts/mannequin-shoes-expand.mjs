// Add more clean shoes to the mannequin pool. Looks at shoe photos that were
// never background-removed (cutout_url IS NULL), keeps the clean ones using
// shoe-appropriate rules, removes their background, and marks them ready.
// Run with:  node scripts/mannequin-shoes-expand.mjs

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

async function shoeOk(imageUrl) {
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
                "This photo is for an outfit display. Reply YES if it clearly shows footwear (one shoe or a " +
                "matching pair) on a plain background — side-profile or angled shots are fine. Reply NO if it " +
                "is worn on a person's feet, multiple different products, a zoomed-in detail, or a busy " +
                "background. Reply ONLY 'yes' or 'no'.",
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
  .eq("category", "shoes")
  .is("cutout_url", null)
  .not("image_url", "is", null);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Checking ${items.length} more shoe photos…`);

let added = 0, skipped = 0, failed = 0, done = 0;
const CONCURRENCY = 3;
for (let i = 0; i < items.length; i += CONCURRENCY) {
  await Promise.all(
    items.slice(i, i + CONCURRENCY).map(async (it) => {
      try {
        if (await shoeOk(it.image_url)) {
          const cutout_url = await makeCutout(it.id, it.image_url);
          await supabase.from("items").update({ mannequin_ok: true, cutout_url }).eq("id", it.id);
          added++;
        } else {
          await supabase.from("items").update({ mannequin_ok: false }).eq("id", it.id);
          skipped++;
        }
      } catch (e) {
        failed++;
        if (failed <= 5) console.error("  fail", it.id, e.message);
      }
    })
  );
  done += Math.min(CONCURRENCY, items.length - i);
  if (done % 15 === 0 || done >= items.length) {
    console.log(`  ${done}/${items.length}  (added: ${added}, skipped: ${skipped}, failed: ${failed})`);
  }
}
console.log(`\nDone. Shoes added: ${added}, skipped: ${skipped}, failed: ${failed}`);
