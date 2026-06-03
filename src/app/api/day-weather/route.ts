// GET /api/day-weather?lat=..&lon=..&date=YYYY-MM-DD
//
// Looks up the forecast for ONE specific calendar day (up to ~16 days ahead)
// and suggests wardrobe items that suit it. Used by the calendar page so each
// day you plan can show its weather + an outfit idea.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

// Item plus the gender tag + mannequin fields stored in the database.
type ItemG = Item & { gender?: string; mannequin_ok?: boolean; cutout_url?: string | null };

// Same mapping the "What to wear" feature uses, so they agree.
function describeWeather(code: number) {
  if (code === 0) return { description: "clear", emoji: "☀️", wet: false };
  if ([1, 2, 3].includes(code)) return { description: "partly cloudy", emoji: "⛅", wet: false };
  if ([45, 48].includes(code)) return { description: "foggy", emoji: "🌫️", wet: false };
  if ([51, 53, 55, 56, 57].includes(code)) return { description: "drizzle", emoji: "🌦️", wet: true };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { description: "rain", emoji: "🌧️", wet: true };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { description: "snow", emoji: "❄️", wet: true };
  if ([95, 96, 99].includes(code)) return { description: "thunderstorms", emoji: "⛈️", wet: true };
  return { description: "changeable", emoji: "🌡️", wet: false };
}

function targetSeason(t: number) {
  if (t <= 8) return "winter";
  if (t <= 15) return "autumn";
  if (t <= 22) return "spring";
  return "summer";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (!lat || !lon || !date) {
    return NextResponse.json({ available: false });
  }

  // Ask Open-Meteo for the next ~16 days of daily forecast.
  const w = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=16`
  );
  if (!w.ok) return NextResponse.json({ available: false });
  const wd = await w.json();

  // Find this exact date in the forecast. If it's not in range
  // (too far in the future, or in the past), there's no forecast for it.
  const days: string[] = wd.daily?.time ?? [];
  const idx = days.indexOf(date);
  if (idx === -1) return NextResponse.json({ available: false });

  const tempC = Math.round(wd.daily.temperature_2m_max[idx]);
  const lowC = Math.round(wd.daily.temperature_2m_min[idx]);
  const { description, emoji, wet } = describeWeather(wd.daily.weather_code[idx]);
  const season = targetSeason(tempC);
  const needOuter = tempC <= 15 || wet; // suggest a jacket on cool/cold/wet days

  // Pull items that suit this season (or are tagged "all"), including gender.
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const FIELDS = "id,name,category,image_url,season,gender,mannequin_ok,cutout_url";
  const [seasonRes, outerRes] = await Promise.all([
    supabase.from("items").select(FIELDS).in("season", [season, "all"]),
    // Jackets are scarce, so source outerwear from ANY season when it's cold/wet.
    supabase.from("items").select(FIELDS).eq("category", "outerwear"),
  ]);

  const seasonAll = (seasonRes.data ?? []) as ItemG[];
  // Prefer clean, mannequin-ready photos; fall back to everything if none tagged.
  const seasonTagged = seasonAll.filter((i) => i.mannequin_ok);
  const seasonPool = (seasonTagged.length > 0 ? seasonTagged : seasonAll).filter(
    (i) => i.category !== "outerwear"
  );
  const outerPool = ((outerRes.data ?? []) as ItemG[]).filter((i) => i.mannequin_ok);

  const items = [...seasonPool, ...outerPool];

  // Build a complete look from a pool of items.
  const buildOutfit = (pool: ItemG[], allowDress: boolean) => {
    const pick = (category: string) => {
      const m = pool.filter((i) => i.category === category);
      return m.length ? m[Math.floor(Math.random() * m.length)] : null;
    };
    const out: ItemG[] = [];
    if (needOuter) {
      const o = pick("outerwear");
      if (o) out.push(o);
    }
    const dresses = pool.filter((i) => i.category === "dress");
    if (allowDress && dresses.length && Math.random() < 0.5) {
      out.push(dresses[Math.floor(Math.random() * dresses.length)]);
    } else {
      const t = pick("top");
      if (t) out.push(t);
      const b = pick("bottom");
      if (b) out.push(b);
    }
    // Shoes — avoid open footwear (sandals/slides) when it's cold or wet.
    let shoes = pool.filter((i) => i.category === "shoes");
    if (needOuter) {
      const closed = shoes.filter((i) => !/sandal|slide|flip|flop|thong|espadrille/i.test(i.name));
      if (closed.length) shoes = closed;
    }
    if (shoes.length) out.push(shoes[Math.floor(Math.random() * shoes.length)]);
    return out;
  };

  // Men's pool = men + unisex; women's pool = women + unisex.
  const menPool = items.filter((i) => i.gender === "men" || i.gender === "unisex" || !i.gender);
  const womenPool = items.filter((i) => i.gender === "women" || i.gender === "unisex" || !i.gender);

  const outfits = {
    men: buildOutfit(menPool, false),
    women: buildOutfit(womenPool, true),
  };

  return NextResponse.json({
    available: true,
    tempC,
    lowC,
    description,
    emoji,
    wet,
    needOuter,
    outfits,
  });
}
