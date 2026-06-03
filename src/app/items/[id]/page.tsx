"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Item } from "@/lib/types";
import { useItemModal, ITEMS_CHANGED } from "@/components/ItemModalProvider";
import { Shirt, Pencil, Trash2, ImageOff } from "lucide-react";

export default function ItemDetailPage() {
  // useParams reads the ":id" out of the URL (/items/5 -> id = "5").
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { openEdit } = useItemModal();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const res = await fetch(`/api/items/${id}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setItem(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reload this item after it's edited via the modal.
  useEffect(() => {
    const h = () => load();
    window.addEventListener(ITEMS_CHANGED, h);
    return () => window.removeEventListener(ITEMS_CHANGED, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function wearToday() {
    const res = await fetch(`/api/items/${id}/wear`, { method: "POST" });
    if (res.ok) setItem(await res.json());
  }

  async function remove() {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (notFound || !item)
    return (
      <div className="card p-10 text-center">
        <p className="font-medium">That item could not be found.</p>
        <Link href="/" className="btn-primary mt-4">
          Back to wardrobe
        </Link>
      </div>
    );

  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-foreground transition">
        ← Back to wardrobe
      </Link>

      <div className="grid md:grid-cols-2 gap-8 mt-4">
        {/* Photo */}
        <div className="card aspect-square bg-foreground/[0.04] flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageOff className="opacity-40" size={64} />
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge>{item.category}</Badge>
            {item.colour && <Badge>{item.colour}</Badge>}
            <Badge>{item.season}</Badge>
          </div>

          <div className="card p-4 mt-6 flex items-center gap-3">
            <Shirt size={22} className="text-muted" />
            <div>
              <p className="text-2xl font-bold leading-none">{item.times_worn}</p>
              <p className="text-xs text-muted mt-1">times worn</p>
            </div>
            <button onClick={wearToday} className="btn-ghost ml-auto">
              Wore it today
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <button onClick={() => openEdit(item)} className="btn-ghost">
              <Pencil size={16} /> Edit
            </button>
            <button onClick={remove} className="btn-danger">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// A small rounded "pill" used for category / colour / season.
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="capitalize text-sm rounded-full border border-border bg-surface px-3 py-1">
      {children}
    </span>
  );
}
