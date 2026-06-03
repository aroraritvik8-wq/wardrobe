"use client";

import { useState } from "react";
import Link from "next/link";
import type { Item } from "@/lib/types";
import Mannequin from "@/components/Mannequin";

type PackResult = { summary: string; items: Item[]; missing: string[] };

// Build one representative outfit (one item per category) from the packed bag.
function sampleOutfit(items: Item[]) {
  const order = ["outerwear", "top", "dress", "bottom", "shoes"];
  const out: Item[] = [];
  for (const cat of order) {
    // only one upper garment (a top OR a dress)
    if ((cat === "top" || cat === "dress") && out.some((o) => o.category === "top" || o.category === "dress"))
      continue;
    const inCat = items.filter((i) => i.category === cat);
    // prefer a clean cut-out item so the stack has the clear-bg look
    const found = inCat.find((i) => i.mannequin_ok) ?? inCat[0];
    if (found) out.push(found);
  }
  return out;
}

export default function PackPage() {
  const [trip, setTrip] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PackResult | null>(null);

  async function build(e: React.FormEvent) {
    e.preventDefault();
    if (!trip.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Packing assistant</h1>
      <p className="text-muted text-sm mb-6">
        Describe your trip and I&apos;ll pack a bag from your wardrobe.
      </p>

      <form onSubmit={build} className="flex gap-2 mb-8 max-w-xl">
        <input
          className="field flex-1"
          value={trip}
          onChange={(e) => setTrip(e.target.value)}
          placeholder="e.g. 3 days in Melbourne, winter"
        />
        <button className="btn-primary" disabled={loading}>
          {loading ? "Packing…" : "Build list"}
        </button>
      </form>

      {loading && <p className="text-muted">Thinking about your trip…</p>}

      {result && (
        <div className="space-y-8">
          {result.summary && <p className="card p-4 text-sm">{result.summary}</p>}

          {/* A sample outfit from the bag, in the same stacked form */}
          {sampleOutfit(result.items ?? []).length > 0 && (
            <div className="flex justify-center">
              <Mannequin items={sampleOutfit(result.items ?? [])} label="A look from your bag" />
            </div>
          )}

          <div>
            <h2 className="font-semibold mb-3">Pack these ({result.items?.length ?? 0})</h2>
            {result.items?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {result.items.map((it) => (
                  <Link key={it.id} href={`/items/${it.id}`} className="card overflow-hidden block">
                    <div className="aspect-square bg-foreground/[0.04] overflow-hidden">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-4xl opacity-40">🧺</span>
                      )}
                    </div>
                    <p className="text-sm p-2 truncate">{it.name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm">Couldn&apos;t pick items — try describing the trip differently.</p>
            )}
          </div>

          {result.missing?.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">You might also want</h2>
              <ul className="card p-4 list-disc list-inside text-sm space-y-1">
                {result.missing.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}