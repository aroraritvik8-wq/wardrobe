// Detect each item's gender (men / women / unisex) from its photo.
// Run with:  node scripts/gender-tag.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const KEY = env.OPEN_AI_API_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function detectGender(image) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 5,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Is this clothing item men's, women's, or unisex? Reply with ONLY one word: men, women, or unisex." },
            { type: "image_url", image_url: { url: image, detail: "low" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("OpenAI " + res.status);
  const data = await res.json();
  const t = (data.choices?.[0]?.message?.content ?? "").toLowerCase();
  if (t.includes("women")) return "women"; // check "women" first ("women" contains "men")
  if (t.includes("men")) return "men";
  return "unisex";
}

const { data: items, error } = await supabase.from("items").select("id,image_url").limit(2000);
if (error) { console.error(error.message); process.exit(1); }
const withPhotos = items.filter((i) => i.image_url);
console.log(`Detecting gender for ${withPhotos.length} items…`);

let done = 0, failed = 0;
const BATCH = 8;
for (let i = 0; i < withPhotos.length; i += BATCH) {
  await Promise.all(withPhotos.slice(i, i + BATCH).map(async (it) => {
    try {
      const gender = await detectGender(it.image_url);
      await supabase.from("items").update({ gender }).eq("id", it.id);
    } catch { failed++; }
  }));
  done += Math.min(BATCH, withPhotos.length - i);
  if (done % 80 === 0 || done === withPhotos.length) console.log(`  ${done}/${withPhotos.length} (failed: ${failed})`);
}
console.log(`Done. Failures: ${failed}`);
