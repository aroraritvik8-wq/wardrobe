"use client";

import { useEffect, useState, useCallback } from "react";
import type { Item } from "@/lib/types";
import Mannequin from "@/components/Mannequin";

type Entry = {
  id: number;
  date: string;
  planned: boolean;
  item_id: number;
  items: { name: string; image_url: string | null } | { name: string; image_url: string | null }[] | null;
};

type DayWeather = {
  available: boolean;
  tempC?: number;
  lowC?: number;
  description?: string;
  emoji?: string;
  wet?: boolean;
  needOuter?: boolean;
  outfits?: { men: Item[]; women: Item[] };
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
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [dayWx, setDayWx] = useState<DayWeather | null>(null);
  const [wxLoading, setWxLoading] = useState(false);
  const [forecast, setForecast] = useState<Record<string, { tempC: number; emoji: string }>>({});

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

  // Ask the browser for the user's location once, so we can show the forecast.
  useEffect(() => { enableWeather(); }, []);

  // Once we know the location, pull weather for the whole visible month.
  // (Past days = recorded weather, next ~16 days = forecast.)
  useEffect(() => {
    if (!coords) return;
    const dim = new Date(year, month + 1, 0).getDate();
    const start = dateStr(year, month, 1);
    const end = dateStr(year, month, dim);
    fetch(`/api/forecast?lat=${coords.lat}&lon=${coords.lon}&start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, { tempC: number; emoji: string }> = {};
        for (const day of d.days ?? []) map[day.date] = { tempC: day.tempC, emoji: day.emoji };
        setForecast(map);
      })
      .catch(() => {});
  }, [coords, year, month]);

  // Whenever the chosen day (or our location) changes, fetch that day's forecast.
  useEffect(() => {
    if (!selected || !coords) { setDayWx(null); return; }
    setWxLoading(true);
    fetch(`/api/day-weather?lat=${coords.lat}&lon=${coords.lon}&date=${selected}`)
      .then((r) => r.json())
      .then((d) => setDayWx(d))
      .catch(() => setDayWx(null))
      .finally(() => setWxLoading(false));
  }, [selected, coords]);

  // Pop the browser's location prompt; store the coordinates if allowed.
  function enableWeather() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

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

  async function addEntry(item_id: number) {
    if (!selected) return;
    // Decide automatically from the date: a future day is "planned",
    // today or a past day is "worn".
    const planned = selected > today;
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
  // Add every item of a suggested outfit to the selected day at once.
  async function planOutfit(list: Item[]) {
    if (!selected || !list?.length) return;
    const planned = selected > today;
    await Promise.all(
      list.map((it) =>
        fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selected, item_id: it.id, planned }),
        })
      )
    );
    loadEntries();
  }

  const selectedEntries = selected ? byDate[selected] ?? [] : [];
  // The day's logged items, looked up in the wardrobe so we have category +
  // cut-out for the stacked outfit view.
  const dayItems = selectedEntries
    .map((e) => items.find((it) => it.id === e.item_id))
    .filter((it): it is Item => Boolean(it));

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
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs ${isToday ? "font-bold text-accent" : "text-muted"}`}>{d}</span>
                {forecast[ds] && (
                  <span className="text-[10px] leading-none text-muted whitespace-nowrap">
                    {forecast[ds].emoji}{forecast[ds].tempC}°
                  </span>
                )}
              </div>
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

          {/* Weather forecast + outfit suggestion for this day */}
          {!coords ? (
            <button onClick={enableWeather} className="btn-ghost text-sm mb-4">
              📍 Show weather &amp; outfit ideas
            </button>
          ) : wxLoading ? (
            <p className="text-muted text-sm mb-4">Checking the forecast…</p>
          ) : dayWx && dayWx.available ? (
            <div className="rounded-xl bg-surface-2 p-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{dayWx.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">
                    {dayWx.tempC}°{" "}
                    <span className="text-muted font-normal">/ {dayWx.lowC}°</span> ·{" "}
                    {dayWx.description}
                  </p>
                  <p className="text-xs text-muted">
                    {dayWx.needOuter ? "Layer up — bring a jacket." : "Mild — no coat needed."}
                  </p>
                </div>
              </div>
              {dayWx.outfits &&
                (dayWx.outfits.men.length > 0 || dayWx.outfits.women.length > 0) && (
                  <>
                    <p className="text-xs text-muted mt-4 mb-2">
                      Suggested looks for this weather:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <Mannequin items={dayWx.outfits.men} gender="men" label="Men's" />
                        <button
                          onClick={() => planOutfit(dayWx.outfits!.men)}
                          className="btn-ghost w-full text-xs mt-auto"
                        >
                          + Plan this
                        </button>
                      </div>
                      <div className="flex flex-col">
                        <Mannequin items={dayWx.outfits.women} gender="women" label="Women's" />
                        <button
                          onClick={() => planOutfit(dayWx.outfits!.women)}
                          className="btn-ghost w-full text-xs mt-auto"
                        >
                          + Plan this
                        </button>
                      </div>
                    </div>
                  </>
                )}
            </div>
          ) : dayWx && !dayWx.available ? (
            <p className="text-muted text-xs mb-4">
              No forecast for this day (only the next ~16 days are available).
            </p>
          ) : null}

          {/* The day's outfit, shown as the same neat stack */}
          {dayItems.length > 0 && (
            <div className="flex justify-center mb-4">
              <Mannequin items={dayItems} showList={false} />
            </div>
          )}

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
                    <button
                      onClick={() => removeEntry(e.id)}
                      aria-label="Remove from this day"
                      title="Remove from this day"
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <AddRow items={items} onAdd={addEntry} planned={selected > today} />
          </div>
        </div>
      )}
    </div>
  );
}

function AddRow({ items, onAdd, planned }: { items: Item[]; onAdd: (id: number) => void; planned: boolean }) {
  const [search, setSearch] = useState("");

  // Filter by the search box (shows everything; search to narrow a big wardrobe).
  const filtered = items.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* search box + a note showing how items will be saved (auto from the date) */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          className="field flex-1 min-w-40"
          placeholder="Search your wardrobe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted">
          Tap to add as{" "}
          <span className="font-medium text-foreground">
            {planned ? "Planned" : "Worn"}
          </span>
        </span>
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
              onClick={() => onAdd(it.id)}
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
