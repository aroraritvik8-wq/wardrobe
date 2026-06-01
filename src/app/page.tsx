"use client"; // This page runs in the browser so it can react to clicks/typing.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Item } from "@/lib/types";
import { CATEGORIES, SEASONS } from "@/lib/constants";
import ItemCard from "@/components/ItemCard";

export default function HomePage() {
  // "state" = values the page remembers and re-draws when they change.
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // The current filter choices.
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [search, setSearch] = useState("");

  // Build the /api/items URL with whichever filters are set, then fetch.
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (season) params.set("season", season);
    if (search) params.set("q", search);

    const res = await fetch(`/api/items?${params.toString()}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [category, season, search]);

  // Re-load whenever a filter changes (and once when the page first opens).
  useEffect(() => {
    load();
  }, [load]);

  const filtersActive = category || season || search;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Wardrobe</h1>
          <p className="text-muted text-sm mt-1">
            {loading
              ? "Loading…"
              : `${items.length} item${items.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Filter controls, grouped in a card */}
      <div className="card p-3 mb-8 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="🔍  Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field flex-1 min-w-44"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="field w-auto capitalize"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="field w-auto capitalize"
        >
          <option value="">All seasons</option>
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* The grid (or helpful messages) */}
      {loading ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🧺</div>
          <p className="font-medium">
            {filtersActive ? "No items match your filters." : "Your wardrobe is empty."}
          </p>
          <p className="text-muted text-sm mt-1 mb-4">
            {filtersActive
              ? "Try clearing the search or filters."
              : "Add your first piece of clothing to get started."}
          </p>
          {!filtersActive && (
            <Link href="/add" className="btn-primary">
              + Add your first item
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// A simple grey "loading" placeholder grid, shown while items load.
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card overflow-hidden animate-pulse">
          <div className="aspect-square bg-foreground/[0.06]" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-foreground/[0.06] rounded w-3/4" />
            <div className="h-3 bg-foreground/[0.06] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
