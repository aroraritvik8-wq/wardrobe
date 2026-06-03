// Move base64 photos out of the database into Supabase Storage, and replace
// each item's image_url with a short public URL. Makes the wardrobe load fast.
// Run with:  node scripts/migrate-images.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BUCKET = "wardrobe";

// Pull only the items whose image is an embedded data: URI.
const { data: items, error } = await supabase
  .from("items")
  .select("id,image_url")
  .like("image_url", "data:%")
  .limit(2000);
if (error) { console.error(error.message); process.exit(1); }
console.log(`Migrating ${items.length} embedded photos to storage…`);

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

let done = 0, failed = 0;
const BATCH = 10;
for (let i = 0; i < items.length; i += BATCH) {
  await Promise.all(items.slice(i, i + BATCH).map(async (it) => {
    try {
      const match = it.image_url.match(/^data:(image\/[a-z]+);base64,(.*)$/);
      if (!match) return;
      const mime = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const ext = EXT[mime] || "jpg";
      const path = `migrated/${it.id}.${ext}`;

      const up = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: mime,
        upsert: true,
      });
      if (up.error) throw up.error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await supabase.from("items").update({ image_url: data.publicUrl }).eq("id", it.id);
    } catch (e) {
      failed++;
      if (failed <= 3) console.error("  ", e.message);
    }
  }));
  done += Math.min(BATCH, items.length - i);
  if (done % 100 === 0 || done === items.length) console.log(`  ${done}/${items.length} (failed: ${failed})`);
}
console.log(`Done. Migrated, failures: ${failed}`);
