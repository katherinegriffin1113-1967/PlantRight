// PlantRight — local growing intelligence extracted from Firecrawl results.
//
// The main function fires a second, city-scoped Firecrawl search for the things
// a plan can't get from a zone number alone — local soil, the county extension
// office, and the pests/diseases that actually show up in that area — and mines
// the scraped text for them. Everything here is best-effort: a plan is still
// valid with empty local data, so every extractor degrades to "" / [] rather
// than throwing.

export type SearchResult = {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
};

export type Concern = { name: string; source?: string };
export type LocalInsights = {
  soil: string;
  soilSource?: string;
  extensionTitle?: string;
  extensionUrl?: string;
  concerns: Concern[];
};

// Common garden pests + diseases, lower-cased. Multi-word entries are matched
// as a phrase; we look these up in the scraped local text so the "watch list"
// is grounded in what local pages actually warn about, not a generic list.
const PEST_TERMS: string[] = [
  "aphids", "spider mites", "whiteflies", "squash bugs", "squash vine borer",
  "tomato hornworm", "cabbage worms", "cabbage loopers", "cucumber beetles",
  "flea beetles", "japanese beetles", "colorado potato beetle", "slugs",
  "snails", "thrips", "scale insects", "mealybugs", "root-knot nematodes",
  "spotted lanternfly", "grasshoppers", "leaf miners", "vine weevils",
  "powdery mildew", "downy mildew", "early blight", "late blight",
  "blossom-end rot", "fusarium wilt", "verticillium wilt", "black spot",
  "leaf rust", "fire blight", "anthracnose", "bacterial wilt",
];

// Nicely-cased labels for the terms above (only where simple title-casing is
// wrong or the canonical name reads better).
const PEST_LABEL: Record<string, string> = {
  "aphids": "Aphids",
  "blossom-end rot": "Blossom-end rot",
  "root-knot nematodes": "Root-knot nematodes",
  "colorado potato beetle": "Colorado potato beetle",
  "japanese beetles": "Japanese beetles",
};

const titleCase = (s: string) =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

// Soil descriptors worth surfacing, richest-first so "sandy loam" wins over
// the bare "sandy" or "loam" it contains.
const SOIL_TERMS: string[] = [
  "sandy loam", "clay loam", "silt loam", "sandy clay", "loamy sand",
  "well-drained sandy", "heavy clay", "rocky", "sandy", "clay", "loam",
  "silty", "peaty", "chalky", "acidic", "alkaline",
];

const combineText = (results: SearchResult[], max = 60000) =>
  results
    .map((r) => `${r.title ?? ""}\n${r.description ?? ""}\n${r.markdown ?? ""}`)
    .join("\n\n")
    .slice(0, max);

// Firecrawl gives us MARKDOWN, and anything we show a user must read as prose.
// Reduce markdown to plain text: drop images, unwrap links to their text,
// strip heading/emphasis/quote markers, and drop table/nav lines outright.
function markdownToProse(md: string): string {
  return md
    .split("\n")
    // Table rows, nav crumbs, and heading lines are never good sentences.
    .filter((line) => !/^\s*(#|>|\||[-*_]{3,})/.test(line) && !line.includes(" | "))
    .join("\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/[*_`~]+/g, "") // emphasis / code markers
    .replace(/\\([\\`*_{}[\]()#+.!-])/g, "$1"); // markdown escapes
}

// A candidate localNote must look like a sentence a person wrote, not leftover
// page furniture that survived the strip above.
function readsAsProse(s: string): boolean {
  if (s.length < 30 || s.length > 240) return false;
  if (/https?:\/\/|www\.|\]\(|[|#{}<>]/.test(s)) return false;
  // Mostly letters and spaces — tables of numbers and menus fail this.
  const letters = (s.match(/[a-z]/gi) ?? []).length;
  return letters / s.length > 0.7;
}

// The result a snippet came from, so we can cite it. Returns undefined when no
// page provably mentions the term — an uncited chip beats a wrong citation,
// and the UI renders chips without links just fine.
function sourceFor(term: string, results: SearchResult[]): string | undefined {
  const t = term.toLowerCase();
  return results.find((r) =>
    `${r.title ?? ""} ${r.description ?? ""} ${r.markdown ?? ""}`
      .toLowerCase()
      .includes(t)
  )?.url;
}

function extractSoil(corpus: string, results: SearchResult[]): {
  soil: string;
  soilSource?: string;
} {
  const lower = corpus.toLowerCase();
  const counts = new Map<string, number>();
  for (const term of SOIL_TERMS) {
    // Only count a descriptor when it's actually describing soil nearby.
    const re = new RegExp(
      `${term.replace(/[-\s]/g, "[-\\s]")}\\s+soil|soil[^.]{0,40}?${term.replace(/[-\s]/g, "[-\\s]")}`,
      "gi"
    );
    const n = (lower.match(re) || []).length;
    if (n) counts.set(term, n);
  }
  if (!counts.size) return { soil: "" };
  // Prefer the richest descriptor among the top-mentioned ones.
  const top = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || b[0].length - a[0].length
  )[0][0];
  const pretty = titleCase(top);
  return {
    soil: `${pretty} soil is common in your area — pick plants and amendments that suit it.`,
    soilSource: sourceFor(top, results),
  };
}

function extractExtension(results: SearchResult[]): {
  extensionTitle?: string;
  extensionUrl?: string;
} {
  const hit = results.find((r) => {
    const hay = `${r.title ?? ""} ${r.url ?? ""}`.toLowerCase();
    return (
      /extension|master gardener/.test(hay) &&
      /\.edu|extension/.test((r.url ?? "").toLowerCase())
    );
  });
  if (!hit?.url) return {};
  return { extensionTitle: hit.title || "Local extension office", extensionUrl: hit.url };
}

function extractConcerns(corpus: string, results: SearchResult[]): Concern[] {
  const lower = corpus.toLowerCase();
  const found: Concern[] = [];
  for (const term of PEST_TERMS) {
    if (lower.includes(term)) {
      found.push({
        name: PEST_LABEL[term] ?? titleCase(term),
        source: sourceFor(term, results),
      });
    }
    if (found.length >= 6) break;
  }
  return found;
}

// Attach a short, locally-sourced note to each recommended plant when the
// scraped local text actually mentions it. Mutates `recs` in place; plants with
// no local mention keep whatever the client derives from their tags + frost
// dates. Returns the count enriched (handy for logging).
export function attachLocalNotes(
  recs: Array<{ name: string; localNote?: string; localNoteSource?: string }>,
  results: SearchResult[]
): number {
  let enriched = 0;
  const sentences = markdownToProse(combineText(results))
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(readsAsProse);
  for (const rec of recs) {
    // "Tomato (early variety)" → "tomato"; also try the last significant word
    // ("Sugar Snap Peas" → "peas") so common names still match.
    const base = rec.name.replace(/\(.*?\)/g, "").trim().toLowerCase();
    const short = base.split(/\s+/).slice(-1)[0];
    const needle = base.length >= 4 ? base : short;
    const hit = sentences.find((s) => {
      const sl = s.toLowerCase();
      return sl.includes(needle) || (short.length >= 4 && sl.includes(short));
    });
    if (hit) {
      rec.localNote = hit;
      rec.localNoteSource = sourceFor(needle, results);
      enriched++;
    }
  }
  return enriched;
}

// Build the local search query for a place.
export const localQuery = (location: string) =>
  `${location} garden common pests and diseases, local soil type, and ` +
  `county extension office or master gardener growing guide`;

// Turn raw Firecrawl results (already filtered to city-scoped pages by the
// caller) into structured local insights.
export function extractLocalInsights(results: SearchResult[]): LocalInsights {
  if (!results.length) return { soil: "", concerns: [] };
  const corpus = combineText(results);
  const { soil, soilSource } = extractSoil(corpus, results);
  const { extensionTitle, extensionUrl } = extractExtension(results);
  return {
    soil,
    soilSource,
    extensionTitle,
    extensionUrl,
    concerns: extractConcerns(corpus, results),
  };
}
