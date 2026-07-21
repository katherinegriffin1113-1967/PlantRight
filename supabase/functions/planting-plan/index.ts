// PlantRight — "planting-plan" Edge Function
// Takes a user's address/city and builds a structured planting plan:
//   • USDA hardiness zone: resolved DETERMINISTICALLY from official USDA data
//     (ZIP → phzmapi.org, geocoding via Nominatim when the input has no ZIP),
//     with Firecrawl text extraction only as a last-resort fallback.
//   • Frost dates + planting calendar + cited sources: live web data via
//     Firecrawl, restricted to pages that actually mention the user's city.
//   • Plant picks: the catalog in plants.ts, filtered to the zone and to the
//     gardener's answers (annual/perennial, size, flowering, sun, water).
//   • Nearby nurseries to actually buy the plants from (OpenStreetMap).
// The plan is saved to the database for the signed-in user (RLS-owned).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { matchPlants, type Preferences } from "./plants.ts";
import { findNurseries, nurserySearchUrl } from "./nurseries.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const UA = { "User-Agent": "PlantRight/1.0 (plantright.net)" };

const fetchJson = async (url: string, ms = 8000): Promise<any | null> => {
  try {
    const res = await fetch(url, {
      headers: UA,
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

// --- Deterministic place lookup: input → coordinates + ZIP → USDA zone -----
// The coordinates matter beyond the zone: they're what the nursery search
// measures distance from.
type Place = { zone: string; zip: string; lat: number | null; lon: number | null };

async function lookupPlace(location: string): Promise<Place> {
  const place: Place = { zone: "", zip: "", lat: null, lon: null };

  // A ZIP typed straight into the box is more trustworthy than a geocode.
  place.zip = location.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? "";

  // Geocode regardless — we need lat/lon for the nursery search, and the
  // result also supplies the ZIP when the user typed a city name.
  const results = await fetchJson(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1&countrycodes=us`
  );
  const hit = Array.isArray(results) ? results[0] : null;
  if (hit) {
    const lat = Number(hit.lat);
    const lon = Number(hit.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      place.lat = lat;
      place.lon = lon;
    }
    if (!place.zip) {
      place.zip = hit.address?.postcode?.match(/\d{5}/)?.[0] ?? "";
      // A city-level hit often has no postcode; reverse-geocode its center.
      if (!place.zip && place.lat !== null) {
        const rev = await fetchJson(
          `https://nominatim.openstreetmap.org/reverse?lat=${place.lat}&lon=${place.lon}&format=json`
        );
        place.zip = rev?.address?.postcode?.match(/\d{5}/)?.[0] ?? "";
      }
    }
  }

  // ZIP → USDA hardiness zone (2023 map) via phzmapi.
  if (place.zip) {
    const phz = await fetchJson(`https://phzmapi.org/${place.zip}.json`);
    const zone = typeof phz?.zone === "string" ? phz.zone.toLowerCase() : "";
    if (/^(1[0-3]|[1-9])[ab]?$/.test(zone)) place.zone = zone;
  }

  return place;
}

// Only keep the shapes the catalog matcher understands; anything else the
// client sends is dropped rather than trusted.
const PLANT_TYPES = [
  "vegetable", "fruit", "herb", "flower", "shrub", "tree", "vine", "grass", "groundcover",
];
const oneOf = <T extends string>(v: unknown, allowed: T[]): T | undefined =>
  typeof v === "string" && (allowed as string[]).includes(v) ? (v as T) : undefined;

function sanitizePreferences(raw: unknown): Preferences {
  const p = (raw ?? {}) as Record<string, unknown>;
  const types = Array.isArray(p.types)
    ? p.types.filter((t): t is string => typeof t === "string" && PLANT_TYPES.includes(t))
    : [];
  return {
    types: types as Preferences["types"],
    life: oneOf(p.life, ["any", "annual", "perennial"] as const),
    size: oneOf(p.size, ["any", "small", "medium", "large"] as const),
    flowering: oneOf(p.flowering, ["any", "yes", "no"] as const),
    sun: oneOf(p.sun, ["any", "full", "part", "shade"] as const),
    water: oneOf(p.water, ["any", "low"] as const),
    pollinator: oneOf(p.pollinator, ["any", "yes"] as const),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Prefer a real env secret; otherwise read from the locked-down
    // app_secrets table using the service role (bypasses RLS).
    let firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data } = await admin
          .from("app_secrets")
          .select("value")
          .eq("key", "FIRECRAWL_API_KEY")
          .maybeSingle();
        firecrawlKey = data?.value ?? undefined;
      }
    }
    if (!firecrawlKey) {
      return json({ error: "Server is missing FIRECRAWL_API_KEY." }, 500);
    }

    const { location, preferences: rawPrefs } = await req
      .json()
      .catch(() => ({}));
    if (!location || typeof location !== "string") {
      return json({ error: "Please provide a location." }, 400);
    }
    const preferences = sanitizePreferences(rawPrefs);

    // --- Identify the signed-in user (RLS-scoped client) ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated." }, 401);

    // --- Kick off official zone lookup and Firecrawl search in parallel ---
    const query =
      `${location} USDA plant hardiness zone, average last spring frost and ` +
      `first fall frost dates, and vegetable planting calendar`;

    // The nursery search needs the geocode, but nothing else does — chain it
    // off the place lookup so it runs while Firecrawl is still working.
    const placePromise = lookupPlace(location);
    const nurseriesPromise = placePromise
      .then((p) =>
        p.lat !== null && p.lon !== null ? findNurseries(p.lat, p.lon) : []
      )
      .catch(() => []);

    const [place, fcRes] = await Promise.all([
      placePromise,
      fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          sources: [{ type: "web" }],
          scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
        }),
      }),
    ]);

    if (!fcRes.ok) {
      const detail = await fcRes.text();
      console.error("Firecrawl error:", detail.slice(0, 500));
      return json(
        { error: "Live growing-data lookup failed. Please try again shortly." },
        502
      );
    }

    const fc = await fcRes.json();
    const results = (fc?.data?.web ?? fc?.data ?? []) as Array<{
      title?: string;
      url?: string;
      description?: string;
      markdown?: string;
    }>;

    // Results that are actually ABOUT the searched place. A leading segment
    // with digits is a street address — the city is the next segment.
    const parts = location.split(",");
    const city = ((/\d/.test(parts[0]) && parts[1] ? parts[1] : parts[0]) || location)
      .trim()
      .toLowerCase();
    const scoped = results.filter((r) =>
      `${r.title ?? ""} ${r.description ?? ""} ${r.url ?? ""}`
        .toLowerCase()
        .includes(city)
    );

    // Corpus for text extraction: ONLY city-scoped pages. Generic "zone chart"
    // pages list every zone and every date — using them caused wrong answers.
    const corpus = scoped
      .map((r) => `${r.title ?? ""}\n${r.description ?? ""}\n${r.markdown ?? ""}`)
      .join("\n\n")
      .slice(0, 60000);

    // --- Zone: official USDA data first, scoped text second ---
    let zone = place.zone;
    let zoneSource: "usda" | "scraped" | "" = zone ? "usda" : "";
    if (!zone && corpus) {
      const zoneCounts: Record<string, number> = {};
      const addZone = (z: string, w: number) => {
        if (z) zoneCounts[z] = (zoneCounts[z] ?? 0) + w;
      };
      let zm: RegExpExecArray | null;
      const reZonePhrase = /(?:hardiness\s+)?zone\s*(?:is|:)?\s*(1[0-3]|[1-9])\s*([ab])?/gi;
      while ((zm = reZonePhrase.exec(corpus)) !== null) {
        addZone(`${zm[1]}${zm[2]?.toLowerCase() ?? ""}`, 2);
      }
      const reZoneBare = /\b(1[0-3]|[1-9])([ab])\b/gi;
      while ((zm = reZoneBare.exec(corpus)) !== null) {
        addZone(`${zm[1]}${zm[2].toLowerCase()}`, 1);
      }
      zone =
        Object.entries(zoneCounts).sort(
          (a, b) => b[1] - a[1] || b[0].length - a[0].length
        )[0]?.[0] ?? "";
      if (zone) zoneSource = "scraped";
    }
    const zoneNum = zone.replace(/[ab]$/i, "");

    // --- Frost dates: scoped pages only, season-constrained, date captured ---
    const springMonths = "(?:February|March|April|May|June)";
    const fallMonths = "(?:September|October|November|December)";
    const captureDate = (re: RegExp): string => {
      const m = corpus.match(re);
      return m?.[1] ?? "";
    };
    const lastFrost = captureDate(
      new RegExp(`last\\s+(?:spring\\s+)?frost[^.]{0,60}?(${springMonths}\\s+\\d{1,2})`, "i")
    );
    const firstFrost = captureDate(
      new RegExp(`first\\s+(?:fall\\s+|autumn\\s+)?frost[^.]{0,60}?(${fallMonths}\\s+\\d{1,2})`, "i")
    );

    // --- Plant picks: zone-safe first, then narrowed by the user's answers ---
    const { plants: recommendations, relaxed } = matchPlants(
      zoneNum ? Number(zoneNum) : null,
      preferences
    );

    // --- Where to actually buy them (started before the Firecrawl parse) ---
    const nurseries = await nurseriesPromise;

    const zonePhrase =
      zoneSource === "usda"
        ? `your USDA hardiness zone is ${zone} (official USDA 2023 map${place.zip ? `, ZIP ${place.zip}` : ""})`
        : zone
          ? `your USDA hardiness zone appears to be ${zone} (from the sources below)`
          : `your USDA hardiness zone is not clearly listed in the sources below`;

    const summary =
      `Based on live data for ${location}, ${zonePhrase}. ` +
      (zoneNum && Number(zoneNum) >= 10
        ? `Frost is rare to nonexistent in your zone — you can grow nearly ` +
          `year-round, with summer heat (not cold) as the main constraint. ` +
          `The plants below are matched to your zone and your answers.`
        : `Use the frost dates to time planting: start cool-season crops a few ` +
          `weeks before the last spring frost, and warm-season crops after it. ` +
          `The plants below are matched to your zone and your answers, so they ` +
          `can actually survive your winters and ripen in your summers.`) +
      (relaxed.length
        ? ` Not many plants fit every answer here, so we widened the search on ` +
          `${relaxed.join(" and ")}.`
        : "");

    const sources = [
      ...(zoneSource === "usda"
        ? [
            {
              title: "USDA Plant Hardiness Zone Map (official)",
              url: "https://planthardiness.ars.usda.gov/",
            },
          ]
        : []),
      ...(scoped.length ? scoped : results)
        .filter((r) => r.url)
        .slice(0, 5)
        .map((r) => ({ title: r.title || r.url!, url: r.url! })),
    ];

    const plan = {
      location,
      zone,
      last_frost: lastFrost,
      first_frost: firstFrost,
      growing_season:
        lastFrost && firstFrost ? `${lastFrost} → ${firstFrost}` : "",
      summary,
      recommendations,
      preferences,
      relaxed,
      nurseries,
      nursery_search_url: nurserySearchUrl(location),
      sources,
    };

    // --- Persist for the signed-in user (RLS enforces ownership) ---
    const { error: insertErr } = await supabase
      .from("planting_plans")
      .insert({ user_id: user.id, location, plan });
    if (insertErr) {
      return json({ plan, warning: `Saved-plan write failed: ${insertErr.message}` });
    }

    return json({ plan });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Unexpected error." }, 500);
  }
});
