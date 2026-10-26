import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in to view personal weather context." }, { status: 401 });

  const city = (request.nextUrl.searchParams.get("city") || "").trim().slice(0, 100);
  if (!city) return NextResponse.json({ error: "Set a city in your preferences to get local weather." }, { status: 400 });
  const key = process.env.WEATHERAPI_KEY;
  if (!key) return NextResponse.json({ error: "Weather is not connected yet. Add a commercial weather provider key in the Vercel environment." }, { status: 503 });

  try {
    const url = new URL("https://api.weatherapi.com/v1/current.json");
    url.searchParams.set("key", key);
    url.searchParams.set("q", city);
    url.searchParams.set("aqi", "no");
    const response = await fetch(url, { signal: AbortSignal.timeout(6500), cache: "no-store" });
    if (!response.ok) {
      if (response.status === 400) return NextResponse.json({ error: "That city could not be found. Check the city name in your preferences." }, { status: 422 });
      return NextResponse.json({ error: "Weather provider is temporarily unavailable." }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json({
      location: { name: data.location?.name, region: data.location?.region, country: data.location?.country },
      current: {
        tempC: data.current?.temp_c,
        feelsLikeC: data.current?.feelslike_c,
        condition: data.current?.condition?.text,
        icon: data.current?.condition?.icon,
        humidity: data.current?.humidity,
        windKph: data.current?.wind_kph,
        precipitationMm: data.current?.precip_mm,
        updatedAt: data.current?.last_updated,
      },
    }, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch {
    return NextResponse.json({ error: "Couldn't load the forecast. Check your connection and try again." }, { status: 502 });
  }
}
