// A single clothing card used in the wardrobe grid.
// It shows the photo (or a placeholder if there isn't one) and the name.

import Link from "next/link";
import type { Item } from "@/lib/types";

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="card overflow-hidden block group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="aspect-square bg-foreground/[0.04] flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <span className="text-5xl opacity-40">🧺</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium truncate">{item.name}</p>
        <p className="text-sm text-muted capitalize truncate">
          {item.category}
          {item.colour ? ` · ${item.colour}` : ""}
        </p>
        {item.times_worn > 0 && (
          <p className="text-xs text-muted mt-1">Worn {item.times_worn}×</p>
        )}
      </div>
    </Link>
  );
}
