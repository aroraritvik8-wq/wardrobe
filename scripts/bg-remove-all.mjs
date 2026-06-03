// Background-remove (and trim) EVERY item that doesn't have a cut-out yet,
// regardless of whether it passed the mannequin suitability check. This makes
// every item — including manually-added ones — show on the clear background in
// saved outfits. Does NOT change mannequin_ok (suggestions stay curated).
// Safe to stop/re-run — only processes items with cutout_url IS NULL.
// Run with:  node scripts/bg-remove-all.mjs

// NOTE: does NOT import sharp — sharp + the bg-removal native module clash in
// one process. Trimming happens afterwards via scripts/mannequin-trim.mjs.
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

const { data: items, error } = await supabase
  .from("items")
  .select("id,image_url")
  .is("cutout_url", null)
  .not("image_url", "is", null)
  .limit(2000);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Background-removing ${items.length} remaining items…`);

let done = 0, ok = 0, failed = 0;
const CONCURRENCY = 3;
for (let i = 0; i < items.length; i += CONCURRENCY) {
  await Promise.all(
    items.slice(i, i + CONCURRENCY).map(async (it) => {
      try {
        const blob = await removeBackground(it.image_url);
        const raw = Buffer.from(await blob.arrayBuffer());
        const path = `cutouts/${it.id}.png`;
        const up = await supabase.storage.from(BUCKET).upload(path, raw, {
          contentType: "image/png",
          upsert: true,
        });
        if (up.error) throw up.error;
        const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        await supabase.from("items").update({ cutout_url: url }).eq("id", it.id);
        ok++;
      } catch (e) {
        failed++;
        if (failed <= 5) console.error("  fail", it.id, e.message);
      }
    })
  );
  done += Math.min(CONCURRENCY, items.length - i);
  if (done % 25 === 0 || done >= items.length) {
    console.log(`  ${done}/${items.length}  (ok: ${ok}, failed: ${failed})`);
  }
}
console.log(`\nDone. Cut out: ${ok}, failed: ${failed}`);
