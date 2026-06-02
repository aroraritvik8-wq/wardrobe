"use client";

import { useEffect, useState, useCallback } from "react";
import type { Item } from "@/lib/types";

type Entry = {
  id: number;
  date: string;
  planned: boolean;
  item_id: number;
  items: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const itemOf = (e: Entry) => (Array.isArray(e.items) ? e.items[0] : e.items);

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0–11
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const monthKey = `${year}-${pad(month + 1)}`;

  const loadEntries = useCallback(async () => {
    const res = await fetch(`/api/calendar?month=${monthKey}`);
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
  }, [monthKey]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => {
    fetch("/api/items").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : []));
  }, []);

  // group entries by their date
  const byDate: Record<string, Entry[]> = {};
  for (const e of entries) (byDate[e.date] ??= []).push(e);

  // build the month grid
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = dateStr(now.getFullYear(), now.getMonth(), now.getDate());

  function changeMonth(delta: number) {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y); setSelected(null);
  }

  async function addEntry(item_id: number, planned: boolean) {
    if (!selected) return;
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, item_id, planned }),
    });
    loadEntries();
  }
  async function removeEntry(id: number) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    loadEntries();
  }

  const selectedEntries = selected ? byDate[selected] ?? [] : [];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{MONTHS[month]} {year}</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => changeMonth(-1)} className="btn-ghost">◀</button>
          <button onClick={() => changeMonth(1)} className="btn-ghost">▶</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-xs text-muted text-center">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const ds = dateStr(year, month, d);
          const dayEntries = byDate[ds] ?? [];
          // Work out a near-square grid so any number of items fits the box.
          const cols = Math.max(1, Math.ceil(Math.sqrt(dayEntries.length)));
          const rows = Math.max(1, Math.ceil(dayEntries.length / cols));
          const isToday = ds === today;
          const isSel = ds === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(ds)}
              className={`card aspect-square p-1.5 text-left flex flex-col ${isSel ? "ring-2 ring-accent" : ""}`}
            >
              <span className={`text-xs ${isToday ? "font-bold text-accent" : "text-muted"}`}>{d}</span>
              <div
                className="grid gap-0.5 mt-1 flex-1 min-h-0"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                }}
              >
                {dayEntries.map((e) => {
                  const it = itemOf(e);
                  return (
                    <div key={e.id} className="rounded bg-foreground/[0.06] overflow-hidden min-h-0 min-w-0">
                      {it?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt="" className={`w-full h-full object-cover ${e.planned ? "opacity-50" : ""}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="card p-4 mt-6">
          <h2 className="font-semibold mb-3">{selected}</h2>

          {selectedEntries.length === 0 ? (
            <p className="text-muted text-sm mb-4">Nothing logged for this day yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {selectedEntries.map((e) => {
                const it = itemOf(e);
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg bg-foreground/[0.04] overflow-hidden shrink-0">
                      {it?.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-sm flex-1 font-medium">{it?.name ?? "Item"}</span>
                    <span className="text-xs text-muted">{e.planned ? "Planned" : "Worn"}</span>
                    <button onClick={() => removeEntry(e.id)} className="text-red-600 text-sm">✕</button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <AddRow items={items} onAdd={addEntry} />
          </div>
        </div>
      )}
    </div>
  );
}

function AddRow({ items, onAdd }: { items: Item[]; onAdd: (id: number, planned: boolean) => void }) {
  const [search, setSearch] = useState("");
  const [planned, setPlanned] = useState(false);

  // Filter by the search box (shows everything; search to narrow a big wardrobe).
  const filtered = items.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* search + worn/planned choice */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          className="field flex-1 min-w-40"
          placeholder="Search your wardrobe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="field w-auto"
          value={planned ? "planned" : "worn"}
          onChange={(e) => setPlanned(e.target.value === "planned")}
        >
          <option value="worn">Worn</option>
          <option value="planned">Planned</option>
        </select>
      </div>

      {/* tap a photo to add it to the day */}
      {items.length === 0 ? (
        <p className="text-muted text-sm">No items in your wardrobe yet — add some clothes first.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
          {filtered.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onAdd(it.id, planned)}
              className="card overflow-hidden text-left hover:ring-2 hover:ring-accent transition"
            >
              <div className="aspect-square bg-foreground/[0.04] overflow-hidden">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-2xl opacity-40">🧺</span>
                )}
              </div>
              <p className="text-xs p-1.5 truncate">{it.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
