// Give the seeded items a SENSIBLE season + material based on the garment type
// in their name (the seed had random seasons and blank materials).
// Run with:  node scripts/fix-data.mjs

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

// [pattern, season, material] — checked in order, first match wins (specific first).
const RULES = [
  [/t-?\s?shirt|\btee\b/i, "summer", "cotton"],
  [/hoodie|sweatshirt|pullover|sweater|jumper/i, "winter", "cotton"],
  [/jacket|coat/i, "winter", "polyester"],
  [/polo/i, "all", "cotton"],
  [/blouse/i, "all", "polyester"],
  [/\bshirt\b/i, "all", "cotton"],
  [/jeans|denim/i, "all", "denim"],
  [/shorts/i, "summer", "cotton"],
  [/joggers|sweatpants/i, "all", "cotton"],
  [/leggings/i, "all", "polyester"],
  [/chinos|trousers|\bpants\b/i, "all", "cotton"],
  [/skirt/i, "summer", "cotton"],
  [/sundress/i, "summer", "cotton"],
  [/gown|midi dress/i, "all", "polyester"],
  [/dress/i, "summer", "cotton"],
  [/sneakers|trainers|kicks/i, "all", "canvas"],
  [/boots/i, "winter", "leather"],
  [/sandals|flip.?flop|slides/i, "summer", "rubber"],
  [/heels/i, "all", "leather"],
  [/loafers/i, "all", "leather"],
  [/shoes/i, "all", "leather"],
  [/beanie/i, "winter", "wool"],
  [/scarf/i, "winter", "wool"],
  [/\bcap\b|\bhat\b/i, "summer", "cotton"],
  [/sunglasses|glasses/i, "summer", "plastic"],
  [/watch/i, "all", "metal"],
  [/belt/i, "all", "leather"],
  [/handbag|backpack|purse|wallet|\bbag\b/i, "all", "leather"],
  [/\btop\b/i, "summer", "cotton"],
];

// Fallback per category if no name rule matched.
const CAT_FALLBACK = {
  top: ["all", "cotton"],
  bottom: ["all", "cotton"],
  shoes: ["all", "leather"],
  dress: ["summer", "cotton"],
  accessory: ["all", "fabric"],
};

function tagFor(name, category) {
  for (const [re, season, material] of RULES) {
    if (re.test(name)) return { season, material };
  }
  const [season, material] = CAT_FALLBACK[category] ?? ["all", "fabric"];
  return { season, material };
}

// Re-tag every item by garment type (names tell us what each one is).
const { data: items, error } = await supabase
  .from("items")
  .select("id,name,category")
  .limit(2000);
if (error) { console.error(error.message); process.exit(1); }
console.log(`Re-tagging ${items.length} items by garment type…`);

let done = 0;
const BATCH = 20;
for (let i = 0; i < items.length; i += BATCH) {
  await Promise.all(items.slice(i, i + BATCH).map(async (it) => {
    const { season, material } = tagFor(it.name, it.category);
    await supabase.from("items").update({ season, material }).eq("id", it.id);
  }));
  done += Math.min(BATCH, items.length - i);
  if (done % 100 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
}
console.log("Done. Seasons and materials now match each garment.");
