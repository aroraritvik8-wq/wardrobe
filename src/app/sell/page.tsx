"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";
import { ImageOff, X, Tag } from "lucide-react";

export default function SellPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/sell");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function listItem(id: number, price: string) {
    await fetch("/api/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: id, price }),
    });
    load();
  }
  async function unlist(id: number) {
    await fetch("/api/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: id, unlist: true }),
    });
    load();
  }

  const forSale = items.filter((i) => i.for_sale);
  const available = items.filter((i) => !i.for_sale);

  return (
    <div className="max-w-[1200px] mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Tag size={22} /> Selling
      </h1>
      <p className="text-muted text-sm mt-1 mb-6">
        List the clothes you don&apos;t want anymore and set a price.
      </p>

      {/* Listed for sale */}
      <h2 className="font-semibold text-lg mb-3">Listed for sale ({forSale.length})</h2>
      {forSale.length === 0 ? (
        <p className="text-muted text-sm mb-10">
          Nothing listed yet — pick something from your wardrobe below.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-10">
          {forSale.map((it) => (
            <SaleCard key={it.id} item={it} onRemove={() => unlist(it.id)} />
          ))}
        </div>
      )}

      {/* Available to list */}
      <h2 className="font-semibold text-lg mb-3">List an item</h2>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : available.length === 0 ? (
        <p className="text-muted text-sm">Everything in your wardrobe is already listed.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {available.map((it) => (
            <ListCard key={it.id} item={it} onList={(p) => listItem(it.id, p)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Photo({ item }: { item: Item }) {
  const src = item.cutout_url || item.image_url;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={item.name} className="w-full h-full object-cover" />
  ) : (
    <span className="flex items-center justify-center w-full h-full text-muted opacity-40">
      <ImageOff size={36} />
    </span>
  );
}

// A card for an item that's currently listed for sale.
function SaleCard({ item, onRemove }: { item: Item; onRemove: () => void }) {
  return (
    <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
      <div className="aspect-square bg-surface-3 relative">
        <Photo item={item} />
        <button
          onClick={onRemove}
          title="Remove from sale"
          className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-black/55 text-white hover:bg-black/75 transition"
        >
          <X size={15} />
        </button>
      </div>
      <div className="p-3">
        <p className="font-bold text-[15px]">{item.price != null ? `$${item.price}` : "—"}</p>
        <p className="text-[13px] text-muted truncate capitalize">{item.name}</p>
      </div>
    </div>
  );
}

// A card for an item you can list — enter a price and click List.
function ListCard({ item, onList }: { item: Item; onList: (price: string) => void }) {
  const [price, setPrice] = useState("");
  return (
    <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
      <div className="aspect-square bg-surface-3">
        <Photo item={item} />
      </div>
      <div className="p-3">
        <p className="text-[14px] font-medium truncate mb-2">{item.name}</p>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0"
              inputMode="decimal"
              className="w-full rounded-md bg-surface-2 pl-5 pr-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            disabled={!price}
            onClick={() => onList(price)}
            className="btn-primary px-3 py-1.5 text-sm disabled:opacity-40"
          >
            List
          </button>
        </div>
      </div>
    </div>
  );
}
