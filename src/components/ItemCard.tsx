// A single clothing card in the browse grid — styled like a Facebook
// Marketplace listing: rounded photo, then a bold line and a grey line.

import Link from "next/link";
import type { Item } from "@/lib/types";

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Link href={`/items/${item.id}`} className="group block">
      <div className="aspect-square rounded-lg overflow-hidden bg-surface-3">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-4xl opacity-30">🧺</span>
        )}
      </div>
      <div className="pt-1">
        <p className="font-semibold text-[15px] leading-snug truncate text-foreground">
          {item.name}
        </p>
        <p className="text-[13px] text-muted capitalize truncate">
          {item.category}
          {item.colour ? ` · ${item.colour}` : ""}
        </p>
      </div>
    </Link>
  );
}
