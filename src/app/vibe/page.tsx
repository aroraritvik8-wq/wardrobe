"use client";

import { useState } from "react";
import Link from "next/link";

type Result = {
  id: number;
  name: string;
  category: string;
  colour: string;
  image_url: string | null;
  similarity: number;
};

const EXAMPLES = [
  "something cozy for autumn",
  "light for a hot summer day",
  "smart for a dinner out",
  "warm and waterproof",
];

export default function VibePage() {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  async function run(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setResults(null);
    const res = await fetch("/api/vibe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, gender }),
    });
    const data = await res.json();
    setResults(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Search by vibe</h1>
      <p className="text-muted text-sm mb-6">
        Describe a feeling or occasion — it finds matching clothes by meaning, not exact words.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="flex gap-2 mb-4 max-w-xl"
      >
        <input
          className="field flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. something cozy for autumn"
        />
        <select
          className="field w-auto"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="all">Everyone</option>
          <option value="women">Women&apos;s</option>
          <option value="men">Men&apos;s</option>
        </select>
        <button className="btn-primary" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {/* tap an example to try it */}
      <div className="flex flex-wrap gap-2 mb-8">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => run(ex)}
            className="chip text-xs"
          >
            {ex}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Finding your vibe…</p>}

      {results &&
        !loading &&
        (results.length === 0 ? (
          <p className="text-muted">No matches — try describing it differently.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {results.map((it) => (
              <Link
                key={it.id}
                href={`/items/${it.id}`}
                className="card card-hover group block overflow-hidden"
              >
                <div className="aspect-square bg-surface-2 overflow-hidden">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-4xl opacity-30">
                      🧺
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium truncate">{it.name}</p>
                  <p className="text-xs text-muted capitalize">{it.category}</p>
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  );
}
