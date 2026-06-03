// A single clothing card in the browse grid — styled like a Facebook
// Marketplace listing: rounded photo, then a bold line and a grey line.

import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { Item } from "@/lib/types";

// "Added 3 days ago" style relative time from the created_at timestamp.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [
    [60, "minute"],
    [60, "hour"],
    [24, "day"],
    [7, "week"],
    [4.35, "month"],
    [12, "year"],
  ];
  let value = s;
  let unit = "second";
  for (const [factor, name] of units) {
    if (value < factor) break;
    value = Math.floor(value / factor);
    unit = name;
  }
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

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
          <span className="flex items-center justify-center w-full h-full text-muted opacity-40"><ImageOff size={40} /></span>
        )}
      </div>
      <div className="pt-2">
        <p className="font-semibold text-[15px] leading-snug truncate text-foreground">
          {item.name}
        </p>
        <p className="text-[13px] text-muted capitalize truncate">
          {item.category}
          {item.colour ? ` · ${item.colour}` : ""}
        </p>
        {item.created_at && (
          <p className="text-[13px] text-muted">Added {timeAgo(item.created_at)}</p>
        )}
      </div>
    </Link>
  );
}
