// Rename every item to "{Colour} {Garment}" (e.g. "Blue Jeans", "White Shirt"),
// dropping the random adjectives. Colour is re-detected from the actual photo.
// Run with:  node scripts/fix-names.mjs

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

// ---- colour detection from the photo ----
const PALETTE = [
  ["white", [245, 245, 245]], ["black", [22, 22, 22]], ["grey", [130, 130, 130]],
  ["beige", [222, 205, 170]], ["brown", [120, 80, 45]], ["red", [200, 40, 40]],
  ["pink", [235, 150, 178]], ["orange", [232, 140, 40]], ["yellow", [235, 215, 70]],
  ["green", [60, 150, 70]], ["blue", [45, 90, 200]], ["navy", [30, 40, 92]],
  ["purple", [130, 70, 170]],
];
const nameOf = (r, g, b) => {
  let best = "grey", bd = Infinity;
  for (const [n, [cr, cg, cb]] of PALETTE) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
};
async function bufferFor(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return Buffer.from((url.split(",")[1] ?? ""), "base64");
  const res = await fetch(url);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}
async function detectColour(url) {
  try {
    const buf = await bufferFor(url);
    if (!buf) return null;
    const { data, info } = await sharp(buf).resize(48, 48, { fit: "cover" }).raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height, ch = info.channels;
    const x0 = Math.floor(W * 0.3), x1 = Math.ceil(W * 0.7), y0 = Math.floor(H * 0.3), y1 = Math.ceil(H * 0.7);
    const all = {}, chrom = {}; let total = 0, chromTotal = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * ch, r = data[i], g = data[i + 1], b = data[i + 2];
      const n = nameOf(r, g, b);
      all[n] = (all[n] || 0) + 1; total++;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 45) { chrom[n] = (chrom[n] || 0) + 1; chromTotal++; }
    }
    const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];
    return chromTotal > total * 0.18 ? top(chrom) : top(all);
  } catch { return null; }
}

// ---- garment type from the existing name ----
const NOUNS = [
  [/t-?\s?shirt|\btee\b|tshirt/i, "T-Shirt"], [/hoodie/i, "Hoodie"], [/sweatshirt/i, "Sweatshirt"],
  [/sweater|jumper|pullover/i, "Sweater"], [/cardigan/i, "Cardigan"], [/blouse/i, "Blouse"],
  [/puffer/i, "Puffer Jacket"], [/jacket/i, "Jacket"], [/coat/i, "Coat"], [/polo/i, "Polo Shirt"],
  [/\bshirt\b/i, "Shirt"], [/jeans|denim/i, "Jeans"], [/shorts/i, "Shorts"], [/joggers/i, "Joggers"],
  [/leggings/i, "Leggings"], [/chinos/i, "Chinos"], [/trousers|\bpants\b/i, "Trousers"], [/skirt/i, "Skirt"],
  [/sundress/i, "Sundress"], [/midi dress/i, "Midi Dress"], [/gown/i, "Gown"], [/dress/i, "Dress"],
  [/sneakers|trainers|kicks/i, "Sneakers"], [/slides/i, "Slides"], [/sandals|flip.?flop/i, "Sandals"],
  [/boots/i, "Boots"], [/heels/i, "Heels"], [/loafers/i, "Loafers"], [/shoes/i, "Shoes"],
  [/beanie/i, "Beanie"], [/\bcap\b/i, "Cap"], [/\bhat\b/i, "Hat"], [/scarf/i, "Scarf"],
  [/sunglasses|glasses/i, "Sunglasses"], [/watch/i, "Watch"], [/belt/i, "Belt"], [/handbag/i, "Handbag"],
  [/backpack/i, "Backpack"], [/purse/i, "Purse"], [/wallet/i, "Wallet"], [/\bbag\b/i, "Bag"], [/\btop\b/i, "Top"],
];
const CAT_NOUN = { top: "Top", bottom: "Trousers", shoes: "Shoes", dress: "Dress", accessory: "Accessory" };
const nounFor = (name, category) => {
  for (const [re, disp] of NOUNS) if (re.test(name)) return disp;
  return CAT_NOUN[category] ?? "Item";
};

// ---- run ----
const { data: items, error } = await supabase
  .from("items").select("id,name,category,image_url").limit(2000);
if (error) { console.error(error.message); process.exit(1); }
console.log(`Renaming ${items.length} items to "Colour Garment"…`);

let done = 0;
const BATCH = 12;
for (let i = 0; i < items.length; i += BATCH) {
  await Promise.all(items.slice(i, i + BATCH).map(async (it) => {
    const colour = (await detectColour(it.image_url)) || "grey";
    const noun = nounFor(it.name, it.category);
    const name = `${cap(colour)} ${noun}`;
    await supabase.from("items").update({ name, colour }).eq("id", it.id);
  }));
  done += Math.min(BATCH, items.length - i);
  if (done % 100 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
}
console.log('Done. Items are now named like "Blue Jeans", "White Shirt".');
