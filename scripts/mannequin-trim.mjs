// Trim the transparent padding off each cut-out so garments crop tight to the
// actual clothing. This removes the gaps between stacked items and lets layers
// (e.g. a jacket) overlap the shirt properly.
// Saves to a new path (cutouts/<id>_t.png) and updates cutout_url so browsers
// don't show a stale cached image.
// Run with:  node scripts/mannequin-trim.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

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
  .select("id,cutout_url")
  .not("cutout_url", "is", null)
  .not("cutout_url", "like", "%_t.png"); // skip already-trimmed
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Trimming ${items.length} cut-outs…`);

let done = 0, ok = 0, failed = 0;
const CONCURRENCY = 4;
for (let i = 0; i < items.length; i += CONCURRENCY) {
  await Promise.all(
    items.slice(i, i + CONCURRENCY).map(async (it) => {
      try {
        const res = await fetch(it.cutout_url);
        if (!res.ok) throw new Error("fetch " + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        // Trim fully-transparent borders (threshold keeps soft edges).
        const trimmed = await sharp(buf).trim({ threshold: 10 }).png().toBuffer();

        const path = `cutouts/${it.id}_t.png`;
        const up = await supabase.storage.from(BUCKET).upload(path, trimmed, {
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
  if (done % 20 === 0 || done >= items.length) {
    console.log(`  ${done}/${items.length}  (ok: ${ok}, failed: ${failed})`);
  }
}
console.log(`\nDone. Trimmed: ${ok}, failed: ${failed}`);
