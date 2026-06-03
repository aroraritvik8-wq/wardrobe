"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Outfit } from "@/lib/types";
import Mannequin from "@/components/Mannequin";

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/outfits");
    const data = await res.json();
    setOutfits(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("Delete this outfit?")) return;
    const res = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outfits</h1>
          <p className="text-muted text-sm mt-1">
            {loading ? "Loading…" : `${outfits.length} saved`}
          </p>
        </div>
        <Link href="/outfits/new" className="btn-primary">
          + New outfit
        </Link>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : outfits.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🧥</div>
          <p className="font-medium">No outfits yet.</p>
          <p className="text-muted text-sm mt-1 mb-4">
            Combine a few items into a saved outfit.
          </p>
          <Link href="/outfits/new" className="btn-primary">
            + Create your first outfit
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {outfits.map((outfit) => (
            <div key={outfit.id} className="card p-5">
              <div className="flex items-center mb-4">
                <h2 className="font-semibold text-lg">{outfit.name}</h2>
                <span className="text-xs text-muted ml-3">
                  {outfit.items?.length ?? 0} item
                  {(outfit.items?.length ?? 0) === 1 ? "" : "s"}
                </span>
                <button
                  onClick={() => remove(outfit.id)}
                  className="ml-auto text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
              <div className="flex gap-5 flex-col sm:flex-row">
              <div className="shrink-0">
                <Mannequin items={outfit.items ?? []} />
              </div>
              <div className="flex gap-3 flex-wrap content-start flex-1">
                {outfit.items?.map((item) => (
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="w-20 text-center group"
                  >
                    <div className="aspect-square rounded-xl border border-border bg-foreground/[0.04] flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-2xl opacity-40">🧺</span>
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate">{item.name}</p>
                  </Link>
                ))}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
