// Re-seed the wardrobe with 1000 unique Pexels PRODUCT photos (no people),
// naming each item from the photo's OWN description so the title matches the
// picture, and setting the category/colour from that description too.
// Reads keys from .env.local. Run with:  node scripts/seed-clean.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const PEXELS_KEY = env.PEXELS_API_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// average-colour fallback when the description has no colour word
const COLOURS = [
  ["white", [245, 245, 245]], ["black", [25, 25, 25]], ["grey", [128, 128, 128]],
  ["red", [200, 40, 40]], ["blue", [40, 60, 180]], ["navy", [25, 35, 80]],
  ["green", [40, 140, 60]], ["beige", [225, 200, 160]], ["brown", [110, 70, 40]],
  ["pink", [230, 140, 170]], ["yellow", [230, 210, 60]],
];
function nearestColour(hex) {
  const h = (hex || "#888888").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  let best = "grey", bd = Infinity;
  for (const [name, [cr, cg, cb]] of COLOURS) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bd) { bd = d; best = name; }
  }
  return best;
}

const COLOUR_MAP = {
  white: "white", black: "black", grey: "grey", gray: "grey", red: "red",
  blue: "blue", navy: "navy", green: "green", beige: "beige", brown: "brown",
  pink: "pink", yellow: "yellow", orange: "orange", purple: "purple",
  tan: "beige", cream: "beige", denim: "blue", maroon: "red", olive: "green", teal: "green",
};

// Ordered most-specific first (so "t-shirt" beats "shirt", "handbag" beats "bag").
const NOUNS = [
  [/\bt-?\s?shirts?\b/, "top", "T-Shirt"], [/\btees?\b/, "top", "Tee"],
  [/\bhoodies?\b/, "top", "Hoodie"], [/\bsweatshirts?\b/, "top", "Sweatshirt"],
  [/\bsweaters?\b/, "top", "Sweater"], [/\bjumpers?\b/, "top", "Jumper"],
  [/\bpullovers?\b/, "top", "Pullover"], [/\bcardigans?\b/, "top", "Cardigan"],
  [/\bblouses?\b/, "top", "Blouse"], [/\bjackets?\b/, "top", "Jacket"],
  [/\bcoats?\b/, "top", "Coat"], [/\bpolo\b/, "top", "Polo Shirt"],
  [/\bshirts?\b/, "top", "Shirt"], [/\btops?\b/, "top", "Top"],
  [/\bjeans\b/, "bottom", "Jeans"], [/\bdenim\b/, "bottom", "Jeans"],
  [/\btrousers\b/, "bottom", "Trousers"], [/\bchinos\b/, "bottom", "Chinos"],
  [/\bjoggers\b/, "bottom", "Joggers"], [/\bleggings\b/, "bottom", "Leggings"],
  [/\bshorts\b/, "bottom", "Shorts"], [/\bskirts?\b/, "bottom", "Skirt"],
  [/\bpants\b/, "bottom", "Trousers"],
  [/\bsneakers?\b/, "shoes", "Sneakers"], [/\btrainers?\b/, "shoes", "Trainers"],
  [/\bboots?\b/, "shoes", "Boots"], [/\bheels?\b/, "shoes", "Heels"],
  [/\bsandals?\b/, "shoes", "Sandals"], [/\bloafers?\b/, "shoes", "Loafers"],
  [/\bshoes?\b/, "shoes", "Shoes"],
  [/\bsundress\b/, "dress", "Sundress"], [/\bgown\b/, "dress", "Gown"],
  [/\bdress\b/, "dress", "Dress"],
  [/\bhandbags?\b/, "accessory", "Handbag"], [/\bbackpacks?\b/, "accessory", "Backpack"],
  [/\bpurses?\b/, "accessory", "Purse"], [/\bwallets?\b/, "accessory", "Wallet"],
  [/\bbags?\b/, "accessory", "Bag"], [/\bbeanie\b/, "accessory", "Beanie"],
  [/\bcaps?\b/, "accessory", "Cap"], [/\bhats?\b/, "accessory", "Hat"],
  [/\bsunglasses\b/, "accessory", "Sunglasses"], [/\bglasses\b/, "accessory", "Glasses"],
  [/\bwatch\b/, "accessory", "Watch"], [/\bbelt\b/, "accessory", "Belt"],
  [/\bscarf\b/, "accessory", "Scarf"], [/\bnecklace\b/, "accessory", "Necklace"],
];

const ADJ = ["Classic", "Casual", "Everyday", "Favourite", "Smart", "Relaxed", "Weekend", "Light", "Cosy"];
const SEASONS = ["spring", "summer", "autumn", "winter", "all"];

const PERSON = /\b(person|people|man|men|woman|women|girl|boy|lady|guy|guys|model|models|wearing|wears|worn|holding|hold|hands?|arm|leg|legs|feet|foot|male|female|kid|child|children|sitting|standing|posing|portrait|she|he|his|her|him|body|face)\b/i;
const seen = new Set();

// Turn one Pexels photo into an item, using its description for the name.
function toItem(p, bucket) {
  const a = (p.alt || "").toLowerCase();
  let noun = null, cat = null;
  for (const [re, c, disp] of NOUNS) { if (re.test(a)) { noun = disp; cat = c; break; } }
  let colour = null;
  for (const w of Object.keys(COLOUR_MAP)) { if (new RegExp("\\b" + w + "\\b").test(a)) { colour = COLOUR_MAP[w]; break; } }
  if (!colour) colour = nearestColour(p.avg_color);
  if (!noun) { noun = pick(bucket.fallback); cat = bucket.category; } // description had no clear item word
  return {
    name: `${pick(ADJ)} ${cap(colour)} ${noun}`,
    category: cat,
    colour,
    image_url: p.src.large,
  };
}

async function fetchItems(bucket) {
  const out = [];
  for (const q of bucket.queries) {
    for (let page = 1; page <= 18 && out.length < bucket.count; page++) {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=80&page=${page}`,
        { headers: { Authorization: PEXELS_KEY } }
      );
      if (!res.ok) { console.error("  Pexels", res.status, q); break; }
      const data = await res.json();
      if (!data.photos || data.photos.length === 0) break;
      for (const p of data.photos) {
        if (seen.has(p.id)) continue;
        if (p.alt && PERSON.test(p.alt)) continue;
        seen.add(p.id);
        out.push(toItem(p, bucket));
        if (out.length >= bucket.count) break;
      }
    }
    if (out.length >= bucket.count) break;
  }
  return out;
}

const CATS = [
  { category: "top", count: 200, fallback: ["Tee", "Shirt", "Top"], queries: ["folded t-shirt", "t-shirt flat lay", "blank shirt white background", "folded shirts product", "polo shirt product"] },
  { category: "top", count: 150, fallback: ["Hoodie", "Sweatshirt"], queries: ["folded hoodie", "hoodie flat lay", "hoodie white background", "folded sweatshirt product"] },
  { category: "bottom", count: 150, fallback: ["Jeans", "Trousers"], queries: ["folded jeans", "jeans flat lay", "trousers white background", "folded pants product"] },
  { category: "shoes", count: 150, fallback: ["Sneakers", "Shoes"], queries: ["sneakers white background", "shoes product photography", "shoe still life", "trainers isolated product"] },
  { category: "dress", count: 150, fallback: ["Dress", "Sundress"], queries: ["dress on hanger", "dress white background", "dress flat lay", "dress product photography"] },
  { category: "accessory", count: 200, fallback: ["Bag", "Cap", "Accessory"], queries: ["handbag white background", "sunglasses product", "watch product photography", "cap white background", "backpack product", "belt product"] },
];

console.log("Removing previous Pexels items…");
await supabase.from("items").delete().like("image_url", "%images.pexels.com%");

let all = [];
for (const c of CATS) {
  process.stdout.write(`Fetching ${c.count} ${c.category}… `);
  const items = await fetchItems(c);
  all.push(...items);
  console.log(`got ${items.length}`);
}

// shuffle so categories mix in the grid
for (let i = all.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [all[i], all[j]] = [all[j], all[i]];
}

const base = Date.now();
const rows = all.map((it, i) => ({
  ...it,
  season: pick(SEASONS),
  created_at: new Date(base - i * 60000).toISOString(),
}));

for (let i = 0; i < rows.length; i += 200) {
  const { error } = await supabase.from("items").insert(rows.slice(i, i + 200));
  if (error) console.error("insert", error.message);
}
console.log(`\nDone. Inserted ${rows.length} items, each named from its own photo.`);
