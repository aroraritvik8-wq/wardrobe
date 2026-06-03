"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Item } from "@/lib/types";
import ItemCard from "@/components/ItemCard";
import { useItemModal, ITEMS_CHANGED } from "@/components/ItemModalProvider";
import { Shuffle } from "lucide-react";

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
  const [sort, setSort] = useState<"recent" | "oldest" | "random">("recent");
  const [shuffleNonce, setShuffleNonce] = useState(0);
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
        // API returns newest-first; keep that raw order and sort in the view.
        setItems(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category, q, reload]);

  // The displayed order, derived from the chosen sort.
  const displayed = useMemo(() => {
    if (sort === "oldest") return [...items].reverse();
    if (sort === "random") return shuffleArray(items);
    return items; // "recent" = API order (newest first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sort, shuffleNonce]);

  const shuffle = () => {
    setSort("random");
    setShuffleNonce((n) => n + 1);
  };

  const heading = category
    ? LABELS[category] ?? category
    : q
    ? `Results for “${q}”`
    : "Today's picks";
  const filtered = Boolean(category || q);

  return (
    <div className="max-w-[1880px] mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 min-h-9">
        <h1 className="text-xl font-bold">{heading}</h1>
        <div className="flex items-center gap-2">
          {filtered && (
            <Link href="/" className="text-accent text-[15px] font-semibold hover:underline mr-1">
              Clear
            </Link>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "recent" | "oldest" | "random")}
            className="rounded-md bg-surface-3 px-3 py-2 text-[14px] font-semibold outline-none cursor-pointer"
          >
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="random">Random</option>
          </select>
          <button onClick={shuffle} disabled={loading || items.length < 2} className="btn-ghost gap-1.5">
            <Shuffle size={16} /> Shuffle
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
        <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-2 gap-y-14">
          {displayed.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
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
