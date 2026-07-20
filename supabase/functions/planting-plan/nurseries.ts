// PlantRight — local nursery lookup.
//
// Finds real garden centers and plant nurseries near the user's coordinates,
// sorted by distance, each with a maps link they can open on a phone.
//
// The data is OpenStreetMap, read through Nominatim rather than Overpass:
// the public Overpass instances answered only about one request in three
// (504 under load, ~30s to fail), while Nominatim answers in under a second.
// Nominatim ranks by prominence, not distance, so we sort by distance here.

export type Nursery = {
  name: string;
  address: string;
  miles: number;
  phone: string;
  website: string;
  /** Always populated — opens the place in the user's default maps app. */
  map_url: string;
};

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = { "User-Agent": "PlantRight/1.0 (plantright.net)" };

// Both spellings plus the nursery wording — OSM uses "garden_centre", but US
// listings are often named "... Garden Center" or "... Nursery".
const QUERIES = ["garden centre", "plant nursery"];

// POI types worth showing; anything else has to look like a nursery by name.
const GOOD_TYPES = new Set(["garden_centre", "nursery", "plant_nursery"]);
const NAME_HINT = /nurser|garden cent/i;

const EARTH_MILES = 3958.8;

function milesBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_MILES * 2 * Math.asin(Math.sqrt(a));
}

type NominatimHit = {
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  category?: string;
  address?: Record<string, string | undefined>;
  extratags?: Record<string, string | undefined> | null;
};

function formatAddress(a: Record<string, string | undefined> = {}): string {
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const town = a.city ?? a.town ?? a.village ?? a.hamlet ?? "";
  const cityState = [town, a.state].filter(Boolean).join(", ");
  return [street, cityState, a.postcode].filter(Boolean).join(", ");
}

/**
 * Nurseries within `radiusMiles` of a point, nearest first. Returns an empty
 * array rather than throwing — a plan is still useful without this section.
 */
export async function findNurseries(
  lat: number,
  lon: number,
  radiusMiles = 30,
  limit = 6
): Promise<Nursery[]> {
  // Degrees of latitude are ~69 miles everywhere; longitude narrows toward
  // the poles, so scale it by the cosine of the latitude.
  const dLat = radiusMiles / 69;
  const dLon = radiusMiles / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  const viewbox = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`;

  const seen = new Set<string>();
  const found: Nursery[] = [];

  for (const q of QUERIES) {
    const url =
      `${NOMINATIM}?q=${encodeURIComponent(q)}&format=jsonv2&limit=40` +
      `&bounded=1&viewbox=${viewbox}&addressdetails=1&extratags=1&countrycodes=us`;

    let hits: NominatimHit[] = [];
    try {
      const res = await fetch(url, {
        headers: UA,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body)) hits = body;
      }
    } catch {
      // Skip this query; whatever the other one found is still worth showing.
    }

    for (const h of hits) {
      const name = h.name?.trim();
      // Unnamed POIs are mapped as shapes with no business name — useless to
      // someone deciding where to drive.
      if (!name) continue;
      if (!GOOD_TYPES.has(h.type ?? "") && !NAME_HINT.test(name)) continue;

      const plat = Number(h.lat);
      const plon = Number(h.lon);
      if (!Number.isFinite(plat) || !Number.isFinite(plon)) continue;

      const miles = milesBetween(lat, lon, plat, plon);
      if (miles > radiusMiles) continue; // the viewbox is a box, not a circle

      const key = name.toLowerCase();
      if (seen.has(key)) continue; // same shop matched by both queries
      seen.add(key);

      const address = formatAddress(h.address);
      const tags = h.extratags ?? {};
      found.push({
        name,
        address,
        miles: Math.round(miles * 10) / 10,
        phone: tags.phone ?? tags["contact:phone"] ?? "",
        website: tags.website ?? tags["contact:website"] ?? "",
        map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address ? `${name}, ${address}` : `${name} ${plat},${plon}`
        )}`,
      });
    }

    // Nominatim's usage policy caps clients at one request per second.
    await new Promise((r) => setTimeout(r, 1100));
  }

  return found.sort((a, b) => a.miles - b.miles).slice(0, limit);
}

/** Fallback the UI can always offer when the map data has no coverage. */
export function nurserySearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `garden nursery near ${location}`
  )}`;
}
