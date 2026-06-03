// GET /api/forecast?lat=..&lon=..&start=YYYY-MM-DD&end=YYYY-MM-DD
//
// Returns daily weather to stamp on the calendar's day cells: [{ date, tempC, emoji }].
// It covers the requested month as fully as possible:
//   - past days  -> the actual recorded weather (Open-Meteo "past_days", up to 92 back)
//   - next ~16 days -> the forecast
//   - further out  -> no data exists (weather can't be forecast beyond ~16 days)

import { NextRequest, NextResponse } from "next/server";

function emojiFor(code: number) {
  if (code === 0) return "☀️";
  if ([1, 2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const start = searchParams.get("start"); // first day of the visible month
  const end = searchParams.get("end"); // last day of the visible month
  if (!lat || !lon) return NextResponse.json({ days: [] });

  // Work out how many days back / forward we must request to cover the month.
  const dayMs = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let pastDays = 0;
  let forecastDays = 16;
  if (start) {
    const s = new Date(start + "T00:00:00");
    pastDays = Math.min(92, Math.max(0, Math.round((today.getTime() - s.getTime()) / dayMs)));
  }
  if (end) {
    const e = new Date(end + "T00:00:00");
    forecastDays = Math.min(16, Math.max(1, Math.round((e.getTime() - today.getTime()) / dayMs) + 1));
  }

  const w = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,weather_code&timezone=auto` +
      `&past_days=${pastDays}&forecast_days=${forecastDays}`
  );
  if (!w.ok) return NextResponse.json({ days: [] });
  const wd = await w.json();

  const times: string[] = wd.daily?.time ?? [];
  let days = times.map((date, i) => {
    const max = wd.daily.temperature_2m_max[i];
    return {
      date,
      tempC: max == null ? null : Math.round(max),
      emoji: emojiFor(wd.daily.weather_code[i]),
    };
  });

  // Keep only the days inside the requested month, and drop any with no temp.
  if (start) days = days.filter((d) => d.date >= start);
  if (end) days = days.filter((d) => d.date <= end);
  days = days.filter((d) => d.tempC != null);

  return NextResponse.json({ days });
}
