// Second, STRICTER pass over the items currently marked mannequin_ok = true.
// Demotes any that won't look clean stacked:
//   - landscape / sideways photos (caught by image dimensions)
//   - folded, angled, worn-by-person, multi-item, or busy-background photos
//     (caught by a tougher vision prompt)
// Run with:  node scripts/mannequin-refine.mjs

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
const KEY = env.OPEN_AI_API_KEY;

async function fetchBuffer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("fetch " + r.status);
  return Buffer.from(await r.arrayBuffer());
}

async function strictVision(imageUrl) {
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
                "This photo will be placed in a vertical outfit stack on a website. Reply YES only if ALL " +
                "are true: it shows exactly ONE garment; it is upright and front-on (as worn or hanging); " +
                "the whole garment is visible; and the background is plain or already removed. Reply NO if it " +
                "is folded, rolled, laid flat, photographed at an angle or sideways, a zoomed-in detail, worn " +
                "by a visible person, multiple products, or has a busy/cluttered background. Reply ONLY 'yes' or 'no'.",
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
  .eq("mannequin_ok", true)
  .not("image_url", "is", null);
if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Re-checking ${items.length} mannequin-ready items (stricter)…`);

let kept = 0, demoted = 0, failed = 0, done = 0;
const CONCURRENCY = 3;

for (let i = 0; i < items.length; i += CONCURRENCY) {
  await Promise.all(
    items.slice(i, i + CONCURRENCY).map(async (it) => {
      try {
        // 1) Orientation check — sideways/landscape photos look wrong stacked.
        const buf = await fetchBuffer(it.image_url);
        const meta = await sharp(buf).metadata();
        const landscape = meta.width && meta.height && meta.width > meta.height * 1.15;

        // 2) If upright, run the stricter vision test.
        const ok = !landscape && (await strictVision(it.image_url));

        if (!ok) {
          await supabase.from("items").update({ mannequin_ok: false }).eq("id", it.id);
          demoted++;
        } else {
          kept++;
        }
      } catch (e) {
        failed++;
        if (failed <= 5) console.error("  fail", it.id, e.message);
      }
    })
  );
  done += Math.min(CONCURRENCY, items.length - i);
  if (done % 15 === 0 || done >= items.length) {
    console.log(`  ${done}/${items.length}  (kept: ${kept}, demoted: ${demoted}, failed: ${failed})`);
  }
}
console.log(`\nDone. Clean & kept: ${kept}, demoted: ${demoted}, failed: ${failed}`);
