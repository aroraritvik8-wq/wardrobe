// Give every item a "meaning vector" (embedding) so we can search by vibe.
// Run with:  node scripts/embed-items.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- read keys from .env.local ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const KEY = env.OPEN_AI_API_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Build a short natural description of an item — this is what gets embedded.
function describe(it) {
  const bits = [it.colour, it.material, it.category].filter(Boolean).join(" ");
  const parts = [it.name];
  if (bits) parts.push(`a ${bits}`);
  if (it.season && it.season !== "all") parts.push(`good for ${it.season}`);
  return parts.join(", ");
}

// Ask OpenAI for the embedding vectors of MANY texts in one call (cheap + fast).
async function embed(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) throw new Error("OpenAI " + res.status + ": " + (await res.text()).slice(0, 200));
  const data = await res.json();
  return data.data.map((d) => d.embedding); // one 1536-number array per input, in order
}

// --- run ---
const { data: items, error } = await supabase
  .from("items")
  .select("id,name,category,colour,material,season")
  .limit(2000);
if (error) { console.error(error.message); process.exit(1); }
console.log(`Embedding ${items.length} items…`);

let done = 0;
const CHUNK = 100; // embed 100 items per API call
for (let i = 0; i < items.length; i += CHUNK) {
  const group = items.slice(i, i + CHUNK);
  const vectors = await embed(group.map(describe));
  // store each item's vector (pgvector accepts the text form "[0.1,0.2,...]")
  await Promise.all(
    group.map((it, j) =>
      supabase.from("items").update({ embedding: JSON.stringify(vectors[j]) }).eq("id", it.id)
    )
  );
  done += group.length;
  console.log(`  ${done}/${items.length}`);
}
console.log("Done. Every item now has a meaning-vector.");
