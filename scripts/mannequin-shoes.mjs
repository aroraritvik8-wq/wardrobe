// Fix: the strict pass wrongly demoted ALL shoes (they're side-profile /
// landscape, which is correct for footwear). Re-check shoes that were already
// background-removed (cutout_url set) using shoe-appropriate rules, and restore
// the clean ones to mannequin_ok = true.
// Run with:  node scripts/mannequin-shoes.mjs

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
                "matching pair) on a plain or removed background — side-profile or angled shots are perfectly " +
                "fine. Reply NO if it is worn on a person's feet, shows multiple different products, is a " +
                "zoomed-in detail, or has a busy/cluttered background. Reply ONLY 'yes' or 'no'.",
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

const { data: items, error } = await supabase
  .from("items")
  .select("id,name,image_url")
  .eq("category", "shoes")
  .not("cutout_url", "is", null);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Re-checking ${items.length} background-removed shoe photos…`);

let restored = 0, rejected = 0, failed = 0;
for (const it of items) {
  try {
    if (await shoeOk(it.image_url)) {
      await supabase.from("items").update({ mannequin_ok: true }).eq("id", it.id);
      restored++;
    } else {
      rejected++;
    }
  } catch (e) {
    failed++;
    console.error("  fail", it.id, e.message);
  }
}
console.log(`\nDone. Shoes restored: ${restored}, rejected: ${rejected}, failed: ${failed}`);
