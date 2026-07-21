// PlantRight — plant photos, so a recommendation can be seen and not just read.
//
// Photos and descriptions come from Wikipedia's REST summary endpoint, which is
// free, key-less, CORS-enabled and served from Wikimedia's CDN. It needs an
// *exact* article title, so the catalog's common names are mapped to titles
// here rather than resolved at runtime.
//
// Why a baked map instead of Wikipedia's search API: search is rate-limited far
// more aggressively than the cached summary endpoint (a click storm gets 429s),
// and it guesses badly on garden names — "Bush Beans" resolves to Bush Brothers
// and Company, the canned-bean maker. Every title below was checked against the
// live endpoint: 119 of the 120 return a photo. (Asparagus is the exception —
// its article genuinely has no lead image, so it falls back to text only.)
//
// Adding a plant to the catalog without adding it here is safe: the lookup
// falls back to the plant's own name as a title, and to a graceful "no photo"
// state if that misses.

const WIKI_TITLES = {
  "Tomato (early variety)": "Tomato",
  "Cherry Tomato": "Cherry tomato",
  "Bell Pepper": "Bell pepper",
  "Jalapeño Pepper": "Jalapeño",
  "Zucchini": "Zucchini",
  "Cucumber": "Cucumber",
  "Bush Beans": "Common bean",
  "Pole Beans": "Runner bean",
  "Leaf Lettuce": "Lettuce",
  "Spinach": "Spinach",
  "Kale": "Kale",
  "Swiss Chard": "Chard",
  "Carrots": "Carrot",
  "Radishes": "Radish",
  "Beets": "Beetroot",
  "Broccoli": "Broccoli",
  "Sugar Snap Peas": "Snap pea",
  "Okra": "Okra",
  "Sweet Potatoes": "Sweet potato",
  "Winter Squash": "Winter squash",
  "Garlic": "Garlic",
  "Onions": "Onion",
  "Eggplant": "Eggplant",
  "Rhubarb": "Rhubarb",
  "Asparagus": "Asparagus",
  "Strawberries": "Strawberry",
  "Highbush Blueberry": "Vaccinium corymbosum",
  "Rabbiteye Blueberry": "Vaccinium virgatum",
  "Raspberries": "Raspberry",
  "Thornless Blackberry": "Blackberry",
  "Fig 'Brown Turkey'": "Common fig",
  "Dwarf Meyer Lemon": "Meyer lemon",
  "Avocado": "Avocado",
  "Mango": "Mango",
  "Banana": "Banana",
  "Dwarf Apple Tree": "Apple",
  "Peach Tree": "Peach",
  "Pomegranate": "Pomegranate",
  "Basil": "Basil",
  "Rosemary": "Rosemary",
  "Thyme": "Thyme",
  "Oregano": "Oregano",
  "Mint": "Mentha",
  "Sage": "Salvia officinalis",
  "Chives": "Chives",
  "Cilantro": "Coriander",
  "Flat-leaf Parsley": "Parsley",
  "Dill": "Dill",
  "Lavender 'Munstead'": "Lavandula angustifolia",
  "Lemongrass": "Cymbopogon",
  "Coneflower (Echinacea)": "Echinacea purpurea",
  "Black-eyed Susan": "Rudbeckia hirta",
  "Daylily": "Hemerocallis",
  "Hosta": "Hosta",
  "Peony": "Peony",
  "Siberian Iris": "Iris sibirica",
  "Bearded Iris": "Iris germanica",
  "Sedum 'Autumn Joy'": "Hylotelephium telephium",
  "Russian Sage": "Salvia yangii",
  "Salvia 'May Night'": "Salvia nemorosa",
  "Coreopsis": "Coreopsis",
  "Shasta Daisy": "Leucanthemum × superbum",
  "Garden Phlox": "Phlox paniculata",
  "Bee Balm (Monarda)": "Monarda didyma",
  "Astilbe": "Astilbe",
  "Ostrich Fern": "Matteuccia",
  "Hellebore (Lenten Rose)": "Helleborus orientalis",
  "Catmint (Nepeta)": "Nepeta",
  "Yarrow": "Achillea millefolium",
  "Blanket Flower (Gaillardia)": "Gaillardia",
  "Butterfly Weed": "Asclepias tuberosa",
  "Lantana": "Lantana camara",
  "Tropical Hibiscus": "Hibiscus rosa-sinensis",
  "Bougainvillea": "Bougainvillea",
  "Plumeria": "Plumeria",
  "Bird of Paradise": "Strelitzia reginae",
  "Agapanthus": "Agapanthus",
  "Canna Lily": "Canna (plant)",
  "Marigolds": "Tagetes",
  "Zinnias": "Zinnia",
  "Sunflowers": "Common sunflower",
  "Cosmos": "Cosmos bipinnatus",
  "Petunias": "Petunia",
  "Impatiens": "Impatiens walleriana",
  "Wax Begonia": "Begonia cucullata",
  "Snapdragons": "Antirrhinum majus",
  "Pansies": "Pansy",
  "Nasturtiums": "Tropaeolum majus",
  "Sweet Alyssum": "Lobularia maritima",
  "Lilac": "Syringa vulgaris",
  "Panicle Hydrangea": "Hydrangea paniculata",
  "Bigleaf Hydrangea": "Hydrangea macrophylla",
  "Boxwood": "Buxus sempervirens",
  "Knock Out Rose": "Rosa 'Knock Out'",
  "Viburnum": "Viburnum",
  "Spirea": "Spiraea",
  "Ninebark": "Physocarpus opulifolius",
  "Red Twig Dogwood": "Cornus sericea",
  "Azalea": "Rhododendron simsii",
  "Rhododendron": "Rhododendron catawbiense",
  "Camellia": "Camellia japonica",
  "Gardenia": "Gardenia jasminoides",
  "Oleander": "Nerium",
  "Bottlebrush": "Callistemon",
  "Serviceberry": "Amelanchier",
  "Eastern Redbud": "Cercis canadensis",
  "Flowering Dogwood": "Cornus florida",
  "Japanese Maple": "Acer palmatum",
  "Red Maple": "Acer rubrum",
  "Eastern White Pine": "Pinus strobus",
  "Crepe Myrtle": "Lagerstroemia indica",
  "Live Oak": "Quercus virginiana",
  "Switchgrass": "Panicum virgatum",
  "Little Bluestem": "Schizachyrium scoparium",
  "Fountain Grass": "Cenchrus alopecuroides",
  "Muhly Grass": "Muhlenbergia capillaris",
  "Creeping Thyme": "Thymus serpyllum",
  "Creeping Phlox": "Phlox subulata",
  "Creeping Juniper": "Juniperus horizontalis",
  "Vinca Minor": "Vinca minor",
};

const SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";

// Plans opened repeatedly in one session shouldn't re-fetch. Promises are
// cached, not results, so two fast clicks share one request.
const cache = new Map();

// Titles for plants that aren't in the map: drop cultivar quotes and
// parentheses ("Fig 'Brown Turkey'" → "Fig") and hope the article exists.
function fallbackTitle(name) {
  return name
    .replace(/'[^']*'/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function wikipediaSearchUrl(name) {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;
}

// Wikipedia extracts run to a full paragraph or more. Keep the opening
// sentences — enough to say what the plant is without burying the modal.
function shorten(text, limit = 300) {
  if (!text || text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastStop = cut.lastIndexOf(". ");
  return lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

// The summary endpoint hands back a ~330px-wide thumbnail, which is soft in a
// modal that shows it at 480. Wikimedia's thumb URLs carry their width in the
// path, so a sharper one can be requested by rewriting it — but only at the
// widths Wikimedia pre-renders. Hotlinking any other width is rejected with a
// 400 ("Use thumbnail sizes listed on ..."), which is why 640 and 800 fail
// where 500 and 960 work. See mediawiki.org/wiki/Common_thumbnail_sizes.
//
// The thumbnailer also never scales up, so a bucket is only usable when the
// original is genuinely wider than it.
const THUMB_WIDTHS = [960, 500];

function bestPhoto(data) {
  const thumb = data.thumbnail?.source;
  if (!thumb) return null;

  const original = data.originalimage;
  if (!original?.width) return thumb;

  const target = THUMB_WIDTHS.find((width) => original.width > width);
  if (!target) return original.source || thumb; // smaller than every bucket

  return thumb.replace(/\/(\d+)px-([^/]+)$/, `/${target}px-$2`);
}

async function requestSummary(title) {
  const res = await fetch(SUMMARY_URL + encodeURIComponent(title.replace(/ /g, "_")));
  if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);
  const data = await res.json();
  // Disambiguation pages have no useful photo or description.
  if (data.type && data.type !== "standard") throw new Error("Not an article");
  const thumb = data.thumbnail?.source || null;
  return {
    title: data.title || title,
    photo: bestPhoto(data),
    photoFallback: thumb,
    // originalimage can be many megabytes; a thumbnail is what we display.
    description: shorten(data.extract || ""),
    pageUrl:
      data.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

// Look up one plant. Resolves to a photo record, or to a record with
// photo: null when Wikipedia has no usable article — never rejects, so the
// modal always has something to show.
export function fetchPlantPhoto(name) {
  if (cache.has(name)) return cache.get(name);

  const mapped = WIKI_TITLES[name];
  const promise = (async () => {
    try {
      return await requestSummary(mapped || fallbackTitle(name));
    } catch {
      return {
        title: name,
        photo: null,
        photoFallback: null,
        description: "",
        pageUrl: wikipediaSearchUrl(name),
      };
    }
  })();

  cache.set(name, promise);
  return promise;
}
