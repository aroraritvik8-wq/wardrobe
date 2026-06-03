"use client";

import { useState } from "react";
import Link from "next/link";
import type { Item } from "@/lib/types";
import Mannequin from "@/components/Mannequin";
import { useItemModal } from "@/components/ItemModalProvider";

// The shape of the answer we get back from /api/suggest.
type Suggestion = {
  place: string;
  tempC: number;
  description: string;
  emoji: string;
  wet: boolean;
  season: string;
  needOuter: boolean;
  picks: Item[];
};

export default function SuggestPage() {
  const { openAdd } = useItemModal();
  const [result, setResult] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [city, setCity] = useState("");
  // Remember the last location so "Suggest again" can re-roll the outfit.
  const [lastQuery, setLastQuery] = useState("");

  async function suggest(query: string) {
    setError("");
    setLoading(true);
    setLastQuery(query);
    try {
      const res = await fetch(`/api/suggest?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  // Ask the browser for the user's location, then suggest.
  function useMyLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Your browser can't share location. Type a city instead.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => suggest(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () => {
        setLoading(false);
        setError(
          "Couldn't get your location (you may have blocked it). Type a city instead."
        );
      }
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">What to wear today</h1>
      <p className="text-muted text-sm mt-1 mb-6">
        Get today&apos;s weather and an outfit from your wardrobe to match.
      </p>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-2 mb-6">
        <button onClick={useMyLocation} className="btn-primary">
          📍 Use my location
        </button>
        <span className="text-muted text-sm px-1">or</span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (city.trim()) suggest(`city=${encodeURIComponent(city.trim())}`);
          }}
          className="flex gap-2 flex-1 min-w-52"
        >
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Type a city, e.g. London"
            className="field flex-1"
          />
          <button type="submit" className="btn-ghost">
            Check
          </button>
        </form>
      </div>

      {loading && <p className="text-muted">Checking the weather…</p>}

      {error && (
        <p className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm max-w-lg">
          {error}
        </p>
      )}

      {result && !loading && (
        <div>
          {/* Weather summary */}
          <div className="card p-5 flex items-center gap-4 mb-6">
            <span className="text-5xl">{result.emoji}</span>
            <div>
              <p className="text-2xl font-bold leading-none">{result.tempC}°C</p>
              <p className="text-muted text-sm mt-1 capitalize">
                {result.description} · {result.place}
              </p>
            </div>
            <button
              onClick={() => suggest(lastQuery)}
              className="btn-ghost ml-auto"
            >
              🔄 Suggest again
            </button>
          </div>

          {/* Advice line */}
          <p className="font-medium mb-3">
            {adviceLine(result)}
          </p>

          {/* The suggested outfit */}
          {result.picks.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="font-medium">
                No matching clothes for {result.season} weather yet.
              </p>
              <p className="text-muted text-sm mt-1 mb-4">
                Add some {result.season} (or &quot;all&quot;-season) items and try again.
              </p>
              <button onClick={openAdd} className="btn-primary">
                + Add an item
              </button>
            </div>
          ) : (
            <div>
              {/* The outfit shown as a clean stack */}
              <div className="mb-6 flex justify-center">
                <Mannequin items={result.picks} label="Today's look" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {result.picks.map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="card overflow-hidden block group hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <div className="aspect-square bg-foreground/[0.04] flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-4xl opacity-40">🧺</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted capitalize">{item.category}</p>
                  </div>
                </Link>
              ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// A friendly sentence based on the weather.
function adviceLine(r: Suggestion) {
  if (r.wet) return `It's ${r.tempC}°C and wet — grab a coat (and maybe an umbrella). Here's an idea:`;
  if (r.tempC < 8) return `It's a chilly ${r.tempC}°C — bundle up warm. Here's an idea:`;
  if (r.tempC < 16) return `It's a cool ${r.tempC}°C — a light layer should do. Here's an idea:`;
  if (r.tempC < 23) return `It's a pleasant ${r.tempC}°C. Here's an idea:`;
  return `It's a warm ${r.tempC}°C — keep it light. Here's an idea:`;
}
