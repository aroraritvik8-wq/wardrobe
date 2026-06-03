// Prepare item photos for the mannequin display.
// For each item we haven't processed yet (mannequin_ok IS NULL):
//   1) Ask AI vision whether the photo is a clean, single, front-on garment
//      that would look right placed on a body  ->  sets mannequin_ok.
//   2) If yes, remove its background and save a PNG cut-out  ->  sets cutout_url.
//
// Safe to stop (Ctrl+C) and re-run — it skips anything already processed.
// Run with:  node scripts/mannequin-prep.mjs

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

// Ask the AI if this photo suits a flat front-facing mannequin.
async function isSuitable(imageUrl) {
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
                "I want to overlay this clothing photo onto a flat, front-facing body outline. " +
                "Answer YES only if it shows ONE garment, photographed front-on or laid flat and " +
                "clearly isolated. Answer NO if it is folded/rolled, shows multiple products, is a " +
                "zoomed-in detail, is being worn by a visible person, or is a busy lifestyle scene. " +
                "Reply with ONLY 'yes' or 'no'.",
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

// Remove the background and upload the PNG cut-out; return its public URL.
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
  .select("id,name,image_url,mannequin_ok")
  .not("image_url", "is", null)
  .is("mannequin_ok", null)
  .limit(2000);
if (error) {
  console.error("Could not load items:", error.message);
  console.error("Did you add the columns? Run the SQL shown in chat first.");
  process.exit(1);
}
console.log(`Processing ${items.length} items…`);

let suitable = 0, skipped = 0, failed = 0, done = 0;
const CONCURRENCY = 3;

for (let i = 0; i < items.length; i += CONCURRENCY) {
  await Promise.all(
    items.slice(i, i + CONCURRENCY).map(async (it) => {
      try {
        const ok = await isSuitable(it.image_url);
        if (ok) {
          const cutout_url = await makeCutout(it.id, it.image_url);
          await supabase.from("items").update({ mannequin_ok: true, cutout_url }).eq("id", it.id);
          suitable++;
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
    console.log(`  ${done}/${items.length}  (suitable: ${suitable}, skipped: ${skipped}, failed: ${failed})`);
  }
}
console.log(`\nDone. Mannequin-ready: ${suitable}, not suitable: ${skipped}, failed: ${failed}`);
