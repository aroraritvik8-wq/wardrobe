"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Item } from "@/lib/types";
import ItemForm from "@/components/ItemForm";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setItem(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!item) return <p className="text-muted">That item could not be found.</p>;

  return (
    <div>
      <Link
        href={`/items/${id}`}
        className="text-sm text-muted hover:text-foreground transition"
      >
        ← Back to item
      </Link>
      <h1 className="text-3xl font-bold tracking-tight mt-2 mb-6">Edit item</h1>
      {/* Same form as adding, but pre-filled with this item's details. */}
      <ItemForm initial={item} />
    </div>
  );
}
