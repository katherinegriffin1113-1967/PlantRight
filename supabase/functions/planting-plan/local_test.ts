// deno test — local intelligence extraction: junk-laden Firecrawl markdown in,
// clean cited prose out.
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import {
  attachLocalNotes,
  extractFrostDates,
  extractLocalInsights,
  type SearchResult,
} from "./local.ts";

// A realistic extension page: tables, nav-link rows, images, blockquotes, and
// a few genuine sentences — plus an SEO-spam result that must never be cited.
const RESULTS: SearchResult[] = [
  {
    title: "UF/IFAS Extension Palm Beach County — Vegetable Gardening",
    url: "https://sfyl.ifas.ufl.edu/palmbeach/gardening",
    description: "UF/IFAS Extension guide for West Palm Beach gardeners.",
    markdown: [
      "# Vegetable Gardening Guide",
      "",
      "| Month | Crop | Notes |",
      "|-------|------|-------|",
      "| March | Tomato | plant now |",
      "",
      "[Home](https://x.com) | [About](https://x.com/about) | [Contact](https://x.com/c)",
      "",
      "![Tomato photo](https://img.example/tomato.jpg)",
      "",
      "In South Florida, **okra** thrives in the [hot summer months](https://x.com/heat) when many other vegetables struggle, and does well in the region's sandy soil.",
      "",
      "> Blockquote nav junk here about nothing",
      "",
      "Aphids and whiteflies are the most common pests on tomato plants in Palm Beach County gardens.",
      "",
      "Sandy soil dominates yards here; amend with compost before planting.",
      "",
      "### Related links",
      "- [Master Gardener program](https://sfyl.ifas.ufl.edu/mg)",
    ].join("\n"),
  },
  {
    title: "Random SEO page",
    url: "https://seo-junk.example/plants",
    description: "zone chart for every city",
    markdown: "Buy plants online!!! $$$ [CLICK](https://spam) ###",
  },
];

const JUNK = /[|#{}<>]|\]\(|https?:\/\/|[*_`]/;

Deno.test("local notes are clean prose with honest citations", () => {
  const recs: Array<{
    name: string;
    localNote?: string;
    localNoteSource?: string;
  }> = [
    { name: "Okra" },
    { name: "Tomato (early variety)" },
    { name: "Sweet Potatoes" }, // mentioned nowhere → must get no note
  ];
  const enriched = attachLocalNotes(recs, RESULTS);
  assertEquals(enriched, 2);

  const okra = recs[0];
  assert(okra.localNote, "okra should get a note");
  assert(!JUNK.test(okra.localNote!), `markdown junk leaked: ${okra.localNote}`);
  assertMatch(okra.localNote!, /sandy soil/i);
  assertEquals(
    okra.localNoteSource,
    "https://sfyl.ifas.ufl.edu/palmbeach/gardening"
  );

  assert(recs[1].localNote && !JUNK.test(recs[1].localNote));
  assertEquals(recs[2].localNote, undefined);
});

Deno.test("soil, pests, and the extension office are extracted and cited", () => {
  const li = extractLocalInsights(RESULTS);
  assertMatch(li.soil, /^Sandy/);
  assert(li.concerns.some((c) => c.name === "Aphids"));
  assert(li.concerns.some((c) => c.name === "Whiteflies"));
  assertEquals(li.extensionUrl, "https://sfyl.ifas.ufl.edu/palmbeach/gardening");
  // No chip may cite a page that never mentions its term.
  for (const c of li.concerns) {
    assert(
      c.source !== "https://seo-junk.example/plants",
      `${c.name} cited the spam page`
    );
  }
});

Deno.test("frost dates parse the abbreviated forms real pages use", () => {
  // Verbatim phrasing from almanac.com's Mount Pleasant, SC page — the exact
  // text that produced an empty plan before abbreviations were accepted.
  const faq = extractFrostDates(
    "The average last spring frost date in Mount Pleasant, SC is Mar 21. " +
      "The average first fall frost date in Mount Pleasant, SC is Nov 21."
  );
  assertEquals(faq, { lastFrost: "March 21", firstFrost: "November 21" });

  // Their table layout: labels first, station between them and the dates.
  const table = extractFrostDates(
    "Nearest Climate Station Altitude Last Spring Frost First Fall Frost " +
      "Growing Season SULLIVANS IS, SC 6' Mar 21 Nov 21 244 days"
  );
  assertEquals(table.firstFrost, "November 21");

  // Full month names still work, and seasons can't cross-capture.
  const full = extractFrostDates(
    "The last frost is typically April 15 and the first fall frost arrives October 25."
  );
  assertEquals(full, { lastFrost: "April 15", firstFrost: "October 25" });

  assertEquals(extractFrostDates("no dates here"), {
    lastFrost: "",
    firstFrost: "",
  });
});

Deno.test("empty results degrade to an empty, not broken, shape", () => {
  const li = extractLocalInsights([]);
  assertEquals(li.soil, "");
  assertEquals(li.concerns, []);
  const recs = [{ name: "Okra" }];
  assertEquals(attachLocalNotes(recs, []), 0);
});
