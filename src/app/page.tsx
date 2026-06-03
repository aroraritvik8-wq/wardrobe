"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Item } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import { useItemModal, ITEMS_CHANGED } from "@/components/ItemModalProvider";

const LABELS: Record<string, string> = {
  top: "Tops",
  bottom: "Bottoms",
  shoes: "Shoes",
  outerwear: "Outerwear",
  dress: "Dresses",
  accessory: "Accessories",
};

// Return a new array in random order (Fisher–Yates shuffle).
function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HomePage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <Browse />
    </Suspense>
  );
}

function Browse() {
  const sp = useSearchParams();
  const category = sp.get("category") ?? "";
  const q = sp.get("q") ?? "";

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const { openAdd } = useItemModal();

  // Re-fetch the grid whenever an item is added/edited via the modal.
  useEffect(() => {
    const h = () => setReload((n) => n + 1);
    window.addEventListener(ITEMS_CHANGED, h);
    return () => window.removeEventListener(ITEMS_CHANGED, h);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    fetch(`/api/items?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(shuffleArray(Array.isArray(d) ? d : []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, q, reload]);

  const shuffle = () => setItems((prev) => shuffleArray(prev));

  const heading = category
    ? LABELS[category] ?? category
    : q
    ? `Results for “${q}”`
    : "Today's picks";
  const filtered = Boolean(category || q);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 min-h-9">
        {filtered ? <h1 className="text-xl font-bold">{heading}</h1> : <span />}
        <div className="flex items-center gap-3">
          {filtered && (
            <Link href="/" className="text-accent text-[15px] font-semibold hover:underline">
              Clear
            </Link>
          )}
          <button onClick={shuffle} disabled={loading || items.length < 2} className="btn-ghost">
            🔀 Shuffle
          </button>
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-lg shadow-sm p-12 text-center">
          <div className="text-5xl mb-3 opacity-60">🧺</div>
          <p className="font-semibold text-lg">
            {filtered ? "No items match." : "Your wardrobe is empty."}
          </p>
          <p className="text-muted text-sm mt-1.5 mb-5">
            {filtered ? "Try a different category or search." : "Add your first piece to get started."}
          </p>
          {filtered ? (
            <Link href="/" className="btn-ghost">Clear</Link>
          ) : (
            <button onClick={openAdd} className="btn-primary">+ Add your first item</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square rounded-lg bg-foreground/[0.06]" />
          <div className="pt-2 space-y-2">
            <div className="h-3 bg-foreground/[0.06] rounded w-3/4" />
            <div className="h-3 bg-foreground/[0.06] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
