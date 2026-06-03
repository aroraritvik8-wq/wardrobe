"use client";

import { useEffect, useState } from "react";

type Product = { title: string; link: string; source: string; image: string | null; price: string };
type Gap = { title: string; reason: string; products: Product[] };

export default function GapsPage() {
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setGaps(null);
    const res = await fetch("/api/gaps");
    const data = await res.json();
    setGaps(data.gaps ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Wardrobe gaps</h1>
          <p className="text-muted text-sm mt-1.5">
            Staples you&apos;re missing — and where to buy them.
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {loading && <p className="text-muted">Analysing your wardrobe…</p>}

      {gaps &&
        !loading &&
        (gaps.length === 0 ? (
          <p className="text-muted">No obvious gaps — nice wardrobe!</p>
        ) : (
          <div className="space-y-10">
            {gaps.map((g, i) => (
              <div key={i}>
                <h2 className="font-semibold text-lg">{g.title}</h2>
                <p className="text-muted text-sm mb-4">{g.reason}</p>
                {g.products.length === 0 ? (
                  <p className="text-muted text-sm">No products found for this one.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {g.products.map((p, j) => (
                      <a
                        key={j}
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card overflow-hidden block hover:shadow-lg hover:-translate-y-0.5 transition-all"
                      >
                        <div className="aspect-square bg-surface-2 overflow-hidden flex items-center justify-center">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image}
                              alt={p.title}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-3xl opacity-30">🛍️</span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-muted">{p.source}</span>
                            {p.price && <span className="text-sm font-semibold">{p.price}</span>}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
