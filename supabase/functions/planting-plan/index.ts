// PlantRight — "planting-plan" Edge Function
// Takes a user's address/city, uses Firecrawl to scrape live, location-specific
// growing data (USDA hardiness zone, frost dates, planting calendar), builds a
// structured plan, saves it to the database for the signed-in user, and returns it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

// Curated, horticulturally-sound plant picks per USDA zone. The zone itself is
// derived from the user's specific address via Firecrawl.
const ZONE_PLANTS: Record<string, { name: string; why: string }[]> = {
  "3": [
    { name: "Siberian Iris", why: "Cold-hardy perennial that shrugs off deep freezes." },
    { name: "Kale", why: "Thrives in short, cool seasons and tolerates frost." },
    { name: "Serviceberry", why: "Native shrub built for harsh northern winters." },
  ],
  "4": [
    { name: "Peony", why: "Needs a hard winter chill to bloom — perfect here." },
    { name: "Spinach", why: "Fast, cool-season crop for a short growing window." },
    { name: "Lilac", why: "Classic cold-climate shrub with reliable spring bloom." },
  ],
  "5": [
    { name: "Coneflower (Echinacea)", why: "Drought-tolerant native perennial." },
    { name: "Tomatoes (early varieties)", why: "Fit the season if started indoors." },
    { name: "Hostas", why: "Shade-loving and fully winter-hardy here." },
  ],
  "6": [
    { name: "Lavender", why: "Loves the balanced season and well-drained soil." },
    { name: "Peppers", why: "Warm enough summers to ripen fully." },
    { name: "Black-eyed Susan", why: "Tough native that reseeds happily." },
  ],
  "7": [
    { name: "Crepe Myrtle", why: "Long, warm season lets it flower for months." },
    { name: "Okra", why: "Heat-lover that flourishes in your summers." },
    { name: "Camellia", why: "Mild winters let this evergreen bloom outdoors." },
  ],
  "8": [
    { name: "Rosemary", why: "Overwinters outdoors in your mild climate." },
    { name: "Sweet Potatoes", why: "Long warm season suits this heat crop." },
    { name: "Gardenia", why: "Fragrant evergreen that loves the warmth." },
  ],
  "9": [
    { name: "Citrus (dwarf Meyer lemon)", why: "Rarely-freezing winters keep it safe." },
    { name: "Bougainvillea", why: "Thrives in heat and abundant sun." },
    { name: "Peppers & Eggplant", why: "Very long season for heat-loving crops." },
  ],
  "10": [
    { name: "Hibiscus", why: "Tropical color that never sees a killing frost." },
    { name: "Avocado", why: "Warm year-round climate supports fruiting." },
    { name: "Bird of Paradise", why: "Frost-free winters let it flower repeatedly." },
  ],
  "11": [
    { name: "Plumeria", why: "True tropical that needs frost-free warmth." },
    { name: "Mango", why: "Heat and humidity suit this tropical fruit." },
    { name: "Bananas", why: "Year-round warmth lets clumps mature." },
  ],
};

const genericPlants = [
  { name: "Native wildflower mix", why: "Adapted to local conditions and pollinator-friendly." },
  { name: "Leaf lettuce", why: "Forgiving cool-season crop for most regions." },
  { name: "Marigolds", why: "Easy annual that deters common garden pests." },
];

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
      return json(
        { error: "Server is missing FIRECRAWL_API_KEY." },
        500
      );
    }

    const { location } = await req.json().catch(() => ({}));
    if (!location || typeof location !== "string") {
      return json({ error: "Please provide a location." }, 400);
    }

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

    // --- Firecrawl: live search + scrape of location-specific growing data ---
    const query =
      `${location} USDA plant hardiness zone, average last spring frost and ` +
      `first fall frost dates, and vegetable planting calendar`;

    const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
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
    });

    if (!fcRes.ok) {
      const detail = await fcRes.text();
      return json(
        { error: `Firecrawl request failed (${fcRes.status}). ${detail.slice(0, 200)}` },
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

    const corpus = results
      .map((r) => `${r.title ?? ""}\n${r.description ?? ""}\n${r.markdown ?? ""}`)
      .join("\n\n")
      .slice(0, 60000);

    // --- Parse structured signals out of the scraped content ---
    // Zone detection. Generic "frost dates by USDA zone" pages list EVERY zone
    // (1,2,3…), so counting across all results is unreliable. Instead, scope to
    // the results that are actually about the searched city, and recognise both
    // "hardiness zone 6a" phrasing and bare "6a"-style codes.
    // A leading segment with digits is a street address ("1600 Amphitheatre
    // Pkwy, Mountain View, CA") — the city is the next segment, not the street.
    const parts = location.split(",");
    const city = ((/\d/.test(parts[0]) && parts[1] ? parts[1] : parts[0]) || location)
      .trim()
      .toLowerCase();
    const scoped = results.filter((r) =>
      `${r.title ?? ""} ${r.description ?? ""} ${r.url ?? ""}`
        .toLowerCase()
        .includes(city)
    );
    const zoneText = (scoped.length ? scoped : results)
      .map((r) => `${r.title ?? ""}\n${r.description ?? ""}\n${r.markdown ?? ""}`)
      .join("\n\n")
      .slice(0, 60000);

    const zoneCounts: Record<string, number> = {};
    const addZone = (z: string) => {
      if (z) zoneCounts[z] = (zoneCounts[z] ?? 0) + 1;
    };
    let zm: RegExpExecArray | null;
    const reZonePhrase = /(?:hardiness\s+)?zone\s*(?:is|:)?\s*(1[0-3]|[1-9])\s*([ab])?/gi;
    while ((zm = reZonePhrase.exec(zoneText)) !== null) {
      addZone(`${zm[1]}${zm[2]?.toLowerCase() ?? ""}`);
    }
    const reZoneBare = /\b(1[0-3]|[1-9])([ab])\b/gi; // "6a", "5b" — letter required
    while ((zm = reZoneBare.exec(zoneText)) !== null) {
      addZone(`${zm[1]}${zm[2].toLowerCase()}`);
    }
    // Most frequent wins; ties prefer the more specific code (with a/b suffix).
    const zone =
      Object.entries(zoneCounts).sort(
        (a, b) => b[1] - a[1] || b[0].length - a[0].length
      )[0]?.[0] ?? "";
    const zoneNum = zone.replace(/[ab]$/i, "");

    // The last spring frost is always a spring date and the first fall frost a
    // fall date — constrain the month AND capture the date itself, so a nearby
    // date from the other season can't be returned by accident.
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

    const recommendations = ZONE_PLANTS[zoneNum] ?? genericPlants;

    const summary =
      `Based on live data for ${location}, your USDA hardiness zone is ` +
      `${zone || "not clearly listed in the sources below"}. ` +
      `Use the frost dates to time planting: start cool-season crops a few weeks ` +
      `before the last spring frost, and warm-season crops after it. The plants ` +
      `below are matched to your zone so they can actually survive your winters and ` +
      `ripen in your summers.`;

    const sources = results
      .filter((r) => r.url)
      .slice(0, 5)
      .map((r) => ({ title: r.title || r.url!, url: r.url! }));

    const plan = {
      location,
      zone,
      last_frost: lastFrost,
      first_frost: firstFrost,
      growing_season:
        lastFrost && firstFrost ? `${lastFrost} → ${firstFrost}` : "",
      summary,
      recommendations,
      sources,
    };

    // --- Persist for the signed-in user (RLS enforces ownership) ---
    const { error: insertErr } = await supabase
      .from("planting_plans")
      .insert({ user_id: user.id, location, plan });
    if (insertErr) {
      // Still return the plan even if saving hiccups.
      return json({ plan, warning: `Saved-plan write failed: ${insertErr.message}` });
    }

    return json({ plan });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Unexpected error." }, 500);
  }
});
