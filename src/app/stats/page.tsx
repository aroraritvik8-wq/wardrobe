"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type Stats = {
  totalItems: number;
  totalWears: number;
  neverWorn: number;
  byCategory: Record<string, number>;
  mostWorn: { id: number; name: string; times_worn: number; image_url: string | null }[];
  outfitCount: number;
};

// Colours for the pie slices.
const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!stats) return <p className="text-muted">Couldn&apos;t load stats.</p>;

  // Turn { top: 350, shoes: 150 } into [{ name: "top", value: 350 }, …] for the charts.
  const categoryData = Object.entries(stats.byCategory).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Stats</h1>

      {/* Number cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total items" value={stats.totalItems} />
        <StatCard label="Times worn" value={stats.totalWears} />
        <StatCard label="Never worn" value={stats.neverWorn} />
        <StatCard label="Outfits" value={stats.outfitCount} />
      </div>

      {/* Bar chart: items per category */}
      <h2 className="font-semibold mb-3">Items by category</h2>
      <div className="card p-4 mb-8">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart: category share */}
      <h2 className="font-semibold mb-3">Category share</h2>
      <div className="card p-4 mb-8">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              label
            >
              {categoryData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Most worn list */}
     <h2 className="font-semibold mb-3">🏆 Most worn leaderboard</h2>
<div className="card divide-y divide-border overflow-hidden">
  {stats.mostWorn.map((it, i) => {
    const medals = ["🥇", "🥈", "🥉"];
    const top = stats.mostWorn[0]?.times_worn || 1;
    return (
      <div
        key={it.id}
        className={`flex items-center gap-3 p-3 ${i === 0 ? "bg-accent/5" : ""}`}
      >
        {/* rank */}
        <span className="w-8 text-center text-lg font-bold shrink-0">
          {medals[i] ?? `#${i + 1}`}
        </span>

        {/* the item's actual photo */}
        <div className="w-40 h-40 rounded-lg bg-foreground/[0.04] overflow-hidden shrink-0">
          {it.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.image_url}
              alt={it.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-lg opacity-40">
              🧺
            </span>
          )}
        </div>

        {/* name + comparison bar */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{it.name}</p>
          <div className="h-1.5 bg-foreground/[0.06] rounded mt-1.5">
            <div
              className="h-full bg-accent rounded"
              style={{ width: `${(it.times_worn / top) * 100}%` }}
            />
          </div>
        </div>

        {/* score */}
        <span className="text-sm font-semibold tabular-nums shrink-0">
          {it.times_worn}×
        </span>
      </div>
    );
  })}
</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-muted text-sm mt-1">{label}</p>
    </div>
  );
}