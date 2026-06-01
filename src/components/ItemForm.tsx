"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/types";
import { CATEGORIES, SEASONS } from "@/lib/constants";

// This one form is used for BOTH adding a new item and editing an existing one.
// If `initial` is given, we're editing; if not, we're adding.
export default function ItemForm({ initial }: { initial?: Item }) {
  const router = useRouter();
  const editing = Boolean(initial);

  // Form fields start either empty (add) or pre-filled (edit).
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [colour, setColour] = useState(initial?.colour ?? "");
  const [season, setSeason] = useState(initial?.season ?? "all");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Show a small preview when the user picks a photo.
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : initial?.image_url ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser doing its own page reload
    setError("");

    // Friendly validation before we send anything.
    if (!name.trim()) {
      setError("Please enter a name for the item.");
      return;
    }
    if (!category) {
      setError("Please choose a category.");
      return;
    }

    setSaving(true);
    try {
      // 1) If the user picked a photo, upload it first and get its URL back.
      let image_url = initial?.image_url ?? null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || "Photo upload failed.");
        image_url = upData.url;
      }

      // 2) Save the item — POST to create, PATCH to update.
      const url = editing ? `/api/items/${initial!.id}` : "/api/items";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, colour, season, image_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the item.");

      // 3) Go back to the item's detail page (or the wardrobe).
      router.push(editing ? `/items/${initial!.id}` : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-lg">
      {error && (
        <p className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {/* Photo picker with live preview */}
      <div>
        <span className="text-sm font-medium">Photo</span>
        <div className="mt-2 flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl bg-foreground/[0.04] border border-border flex items-center justify-center overflow-hidden shrink-0">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl opacity-40">🧺</span>
            )}
          </div>
          <label className="btn-ghost cursor-pointer">
            {preview ? "Change photo" : "Choose photo"}
            <input
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. White Nike Tee"
          className="field mt-1"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field mt-1 capitalize"
          >
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Season</span>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="field mt-1 capitalize"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Colour</span>
        <input
          type="text"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          placeholder="e.g. white"
          className="field mt-1"
        />
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
