// PlantRight — overhead satellite view of the user's address.
//
// The plan already knows the address (plan.location); Mapbox turns that into a
// top-down satellite photo of the property. Two Mapbox calls, both browser-safe
// with a PUBLIC token:
//   1. Geocoding (v6 forward): address string  → lon/lat
//   2. Static Images API:      lon/lat          → a satellite JPEG URL
//
// The token below is a Mapbox PUBLIC token (pk.*), which is designed to ship in
// client code — the same way the Supabase publishable key already does. It is
// URL-restricted in the Mapbox account to this site's domains, so it can't be
// used to run up usage elsewhere. (Never put a SECRET sk.* token here.)
const MAPBOX_TOKEN =
  "pk.eyJ1Ijoia2VncmlmZmluIiwiYSI6ImNtcnV1aHU2MzAxaDAyeXBxdmF1ZDlza3YifQ.fuZS7Q37pf2mq6a6Fhn1AQ";

// One geocode per address per session — cache the promise so re-opening the
// same plan doesn't re-request.
const geocodeCache = new Map();

// Resolve an address to { lon, lat }, or null if Mapbox can't place it.
// Never throws — the caller just hides the map when this returns null.
export function geocodeAddress(address) {
  if (!address) return Promise.resolve(null);
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  const promise = (async () => {
    try {
      const url =
        "https://api.mapbox.com/search/geocode/v6/forward" +
        `?q=${encodeURIComponent(address)}&limit=1&country=us` +
        `&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const coords = data?.features?.[0]?.geometry?.coordinates;
      return Array.isArray(coords) && coords.length === 2
        ? { lon: coords[0], lat: coords[1] }
        : null;
    } catch {
      return null;
    }
  })();

  geocodeCache.set(address, promise);
  return promise;
}

// A satellite Static Images URL. zoom 18 frames a single property; @2x keeps it
// crisp on retina screens. Height/width are the requested pixel size.
export function satelliteImageUrl(lon, lat, { zoom = 18, width = 640, height = 420 } = {}) {
  return (
    "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/" +
    `${lon},${lat},${zoom}/${width}x${height}@2x` +
    `?access_token=${MAPBOX_TOKEN}`
  );
}
