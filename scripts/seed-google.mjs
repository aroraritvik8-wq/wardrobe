// Scrape Google Images with Playwright and fill the wardrobe.
// Run with:  node scripts/seed-google.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ADJ = ["Classic", "Casual", "Everyday", "Favourite", "Smart", "Relaxed", "Weekend", "Light"];
const SEASONS = ["spring", "summer", "autumn", "winter", "all"];
const PERSON = /\b(person|people|man|men|woman|women|girl|boy|model|wearing|worn|holding|hands?|legs?|feet|face|portrait)\b/i;
const COLOURS = ["white","black","grey","gray","red","blue","navy","green","beige","brown","pink","yellow","orange","purple"];

function colourFrom(alt) {
  const a = alt.toLowerCase();
  for (const c of COLOURS) if (new RegExp("\\b" + c + "\\b").test(a)) return c === "gray" ? "grey" : c;
  return null;
}

const CATS = [
  { category: "top", count: 200, noun: "Shirt", queries: ["plain t-shirt product", "folded shirt", "hoodie product"] },
  { category: "bottom", count: 150, noun: "Jeans", queries: ["folded jeans product", "trousers product"] },
  { category: "shoes", count: 150, noun: "Sneakers", queries: ["sneakers white background", "shoes product"] },
  { category: "dress", count: 150, noun: "Dress", queries: ["dress product", "dress on hanger"] },
  { category: "accessory", count: 200, noun: "Accessory", queries: ["handbag product", "cap product", "sunglasses product", "watch product"] },
];

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log("Removing old Pexels items…");
await supabase.from("items").delete().like("image_url", "%images.pexels.com%");

const seen = new Set();
let all = [];

for (const c of CATS) {
  let got = 0;
  for (const q of c.queries) {
    if (got >= c.count) break;
    console.log(`Searching: ${q}`);
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q)}&udm=2&hl=en&gl=us`,
      { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(20000);
    try {
      const btn = page.locator('button:has-text("Reject all"), button:has-text("Accept all")').first();
      if (await btn.isVisible({ timeout: 3000 })) await btn.click();
    } catch {}

    for (let i = 0; i < 15 && got < c.count; i++) {
      await page.mouse.wheel(0, 5000);
      await page.waitForTimeout(700);
    }

    const imgs = await page.$$eval("img", (els) =>
      els.map((e) => ({ src: e.currentSrc || e.src, alt: e.alt || "", w: e.naturalWidth }))
    );

    for (const im of imgs) {
      if (got >= c.count) break;
      if (!im.src || im.w < 70 || im.w > 600) continue;
      if (!im.src.startsWith("data:image")) continue;
      if (seen.has(im.src)) continue;
      if (im.alt && PERSON.test(im.alt)) continue;
      seen.add(im.src);
      const colour = im.alt ? colourFrom(im.alt) : null;
      const name = colour ? `${pick(ADJ)} ${cap(colour)} ${c.noun}` : `${pick(ADJ)} ${c.noun}`;
      all.push({ name, category: c.category, colour: colour || "grey", image_url: im.src });
      got++;
    }
  }
  console.log(`  ${c.category}: collected ${got}`);
}

await browser.close();

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
console.log(`Done. Inserted ${rows.length} items from Google Images.`);