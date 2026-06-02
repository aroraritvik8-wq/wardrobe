// Re-detect each item's colour by looking at the actual pixels of its photo
// (ignoring the white background), then update the colour + the name.
// Run with:  node scripts/fix-colours.mjs

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

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const PALETTE = [
  ["white", [245, 245, 245]], ["black", [22, 22, 22]], ["grey", [130, 130, 130]],
  ["beige", [222, 205, 170]], ["brown", [120, 80, 45]], ["red", [200, 40, 40]],
  ["pink", [235, 150, 178]], ["orange", [232, 140, 40]], ["yellow", [235, 215, 70]],
  ["green", [60, 150, 70]], ["blue", [45, 90, 200]], ["navy", [30, 40, 92]],
  ["purple", [130, 70, 170]],
];
function nameOf(r, g, b) {
  let best = "grey", bd = Infinity;
  for (const [n, [cr, cg, cb]] of PALETTE) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

// Look at the central part of the photo and find the product's dominant colour.
async function dominantColour(url) {
  const small = url.includes("?") ? url + "&w=80&h=80" : url + "?w=80&h=80";
  const res = await fetch(small);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf).resize(48, 48, { fit: "cover" }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ch = info.channels;
  const x0 = Math.floor(W * 0.3), x1 = Math.ceil(W * 0.7);
  const y0 = Math.floor(H * 0.3), y1 = Math.ceil(H * 0.7);
  const all = {}, chrom = {};
  let total = 0, chromTotal = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * ch;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const name = nameOf(r, g, b);
      all[name] = (all[name] || 0) + 1; total++;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 45) { // colourful pixel
        chrom[name] = (chrom[name] || 0) + 1; chromTotal++;
      }
    }
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];
  // If a decent chunk of the centre is colourful, trust that colour;
  // otherwise it's a neutral item (white/black/grey/beige).
  return chromTotal > total * 0.18 ? top(chrom) : top(all);
}

// Replace the colour word (2nd token) in a name like "Casual Blue Jeans".
function rename(oldName, colour) {
  const t = oldName.split(" ");
  if (t.length >= 3) t[1] = cap(colour);
  return t.join(" ");
}

// 1) get all the Pexels items
const { data: items, error } = await supabase
  .from("items")
  .select("id,name,image_url")
  .like("image_url", "%images.pexels.com%");
if (error) { console.error(error.message); process.exit(1); }
console.log(`Re-detecting colours for ${items.length} items…`);

// 2) process in small concurrent batches
let done = 0;
const BATCH = 15;
for (let i = 0; i < items.length; i += BATCH) {
  await Promise.all(items.slice(i, i + BATCH).map(async (it) => {
    try {
      const colour = await dominantColour(it.image_url);
      if (!colour) return;
      await supabase.from("items").update({ colour, name: rename(it.name, colour) }).eq("id", it.id);
    } catch { /* skip on error */ }
  }));
  done += Math.min(BATCH, items.length - i);
  if (done % 100 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
}
console.log("Done. Colours re-detected from the photos.");
