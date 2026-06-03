// GET /api/suggest?lat=..&lon=..   (or ?city=London)
//
// 1) Works out the weather for the given location (free Open-Meteo API, no key).
// 2) Decides the "season" and whether you need a coat.
// 3) Picks an outfit from your wardrobe that suits the weather.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

// Turn Open-Meteo's numeric weather code into words + an emoji + "is it wet?".
function describeWeather(code: number) {
  if (code === 0) return { description: "clear sky", emoji: "☀️", wet: false };
  if ([1, 2, 3].includes(code))
    return { description: "partly cloudy", emoji: "⛅", wet: false };
  if ([45, 48].includes(code))
    return { description: "foggy", emoji: "🌫️", wet: false };
  if ([51, 53, 55, 56, 57].includes(code))
    return { description: "drizzle", emoji: "🌦️", wet: true };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { description: "rain", emoji: "🌧️", wet: true };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { description: "snow", emoji: "❄️", wet: true };
  if ([95, 96, 99].includes(code))
    return { description: "a thunderstorm", emoji: "⛈️", wet: true };
  return { description: "changeable weather", emoji: "🌡️", wet: false };
}

// Map the temperature (°C) to one of our wardrobe seasons.
function targetSeason(t: number) {
  if (t <= 8) return "winter";
  if (t <= 15) return "autumn";
  if (t <= 22) return "spring";
  return "summer";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let lat = searchParams.get("lat");
  let lon = searchParams.get("lon");
  const city = searchParams.get("city");
  let place = "your location";

  // If a city name was given (no coordinates), look up its coordinates first.
  if ((!lat || !lon) && city) {
    const g = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1`
    );
    const gd = await g.json();
    if (!gd.results || gd.results.length === 0) {
      return NextResponse.json(
        { error: `Couldn't find a place called "${city}".` },
        { status: 404 }
      );
    }
    lat = String(gd.results[0].latitude);
    lon = String(gd.results[0].longitude);
    place = [gd.results[0].name, gd.results[0].country].filter(Boolean).join(", ");
  }

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Please share your location or type a city." },
      { status: 400 }
    );
  }

  // Ask the weather service for the current temperature and conditions.
  const w = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
  );
  if (!w.ok) {
    return NextResponse.json(
      { error: "Couldn't fetch the weather right now." },
      { status: 502 }
    );
  }
  const wd = await w.json();
  const tempC = Math.round(wd.current.temperature_2m);
  const { description, emoji, wet } = describeWeather(wd.current.weather_code);

  const season = targetSeason(tempC);
  const needOuter = tempC <= 15 || wet; // cool/cold or wet -> suggest a coat/jacket

  // Get wardrobe items that suit this season (or are tagged "all"), preferring
  // clean background-removed photos so the whole outfit has the cut-out look.
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const [seasonRes, outerRes] = await Promise.all([
    supabase.from("items").select("*").in("season", [season, "all"]),
    // Jackets are scarce — allow them from any season when it's cold/wet.
    supabase.from("items").select("*").eq("category", "outerwear"),
  ]);

  if (seasonRes.error) {
    return NextResponse.json({ error: seasonRes.error.message }, { status: 500 });
  }
  const seasonAll = (seasonRes.data ?? []) as Item[];
  const seasonTagged = seasonAll.filter((i) => i.mannequin_ok);
  const seasonPool = (seasonTagged.length > 0 ? seasonTagged : seasonAll).filter(
    (i) => i.category !== "outerwear"
  );
  const outerPool = ((outerRes.data ?? []) as Item[]).filter((i) => i.mannequin_ok);
  const items = [...seasonPool, ...outerPool];

  // Pick one random item from a category (or null if you own none).
  const pick = (category: string) => {
    const matches = items.filter((i) => i.category === category);
    if (matches.length === 0) return null;
    return matches[Math.floor(Math.random() * matches.length)];
  };

  const picks: Item[] = [];
  if (needOuter) {
    const outer = pick("outerwear");
    if (outer) picks.push(outer);
  }
  for (const category of ["top", "bottom"]) {
    const p = pick(category);
    if (p) picks.push(p);
  }
  // Shoes — avoid open footwear (sandals/slides) when it's cold or wet.
  let shoes = items.filter((i) => i.category === "shoes");
  if (needOuter) {
    const closed = shoes.filter((i) => !/sandal|slide|flip|flop|thong|espadrille/i.test(i.name));
    if (closed.length) shoes = closed;
  }
  if (shoes.length) picks.push(shoes[Math.floor(Math.random() * shoes.length)]);

  return NextResponse.json({
    place,
    tempC,
    description,
    emoji,
    wet,
    season,
    needOuter,
    picks,
  });
}
