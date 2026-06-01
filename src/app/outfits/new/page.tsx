"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Item } from "@/lib/types";

export default function NewOutfitPage() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  // The set of item ids the user has ticked.
  const [chosen, setChosen] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []));
  }, []);

  // Tick or untick an item.
  function toggle(id: number) {
    setChosen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please name the outfit.");
      return;
    }
    if (chosen.length === 0) {
      setError("Pick at least one item for the outfit.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, item_ids: chosen }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not save outfit.");
      setSaving(false);
      return;
    }
    router.push("/outfits");
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <Link
        href="/outfits"
        className="text-sm text-muted hover:text-foreground transition"
      >
        ← Back to outfits
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mt-2 mb-6">New outfit</h1>

      {error && (
        <p className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4 max-w-lg">
          {error}
        </p>
      )}

      <label className="block max-w-lg mb-6">
        <span className="text-sm font-medium">Outfit name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Casual Friday"
          className="field mt-1"
        />
      </label>

      <p className="text-sm font-medium mb-3">
        Pick items{" "}
        <span className="text-muted font-normal">({chosen.length} chosen)</span>
      </p>
      {items.length === 0 ? (
        <p className="text-muted text-sm">
          You have no items yet. Add some clothes first.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {items.map((item) => {
            const selected = chosen.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`card overflow-hidden text-left transition ${
                  selected
                    ? "ring-2 ring-accent"
                    : "hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                <div className="aspect-square bg-foreground/[0.04] flex items-center justify-center overflow-hidden relative">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl opacity-40">🧺</span>
                  )}
                  {selected && (
                    <span className="absolute top-2 right-2 bg-accent text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs p-2 truncate">{item.name}</p>
              </button>
            );
          })}
        </div>
      )}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save outfit"}
      </button>
    </form>
  );
}
