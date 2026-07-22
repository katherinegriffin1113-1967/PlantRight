// PlantRight — address canonicalization for the per-plan address limit.
//
// The limit counts DISTINCT addresses, so two phrasings of the same place must
// collapse to one key: "123 Main Street, Springfield" and "123 main st
// springfield" are the same property, not two. Lowercase, strip punctuation,
// then reduce the words gardeners actually vary (street/st, avenue/ave,
// north/n …) to one canonical short form.
//
// The dashboard keeps a copy of this logic (normLoc in Dashboard.jsx) so the
// UI can warn before the server rejects — CHANGE BOTH TOGETHER.

const ABBREV: Record<string, string> = {
  street: "st",
  avenue: "ave",
  boulevard: "blvd",
  drive: "dr",
  lane: "ln",
  road: "rd",
  court: "ct",
  circle: "cir",
  place: "pl",
  terrace: "ter",
  parkway: "pkwy",
  highway: "hwy",
  trail: "trl",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  northeast: "ne",
  northwest: "nw",
  southeast: "se",
  southwest: "sw",
  apartment: "apt",
  suite: "ste",
};

// Trailing country words never distinguish two US addresses.
const DROP = new Set(["usa", "us", "united", "states", "america"]);

export function normalizeAddress(s: string): string {
  const words = (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => !DROP.has(w))
    .map((w) => ABBREV[w] ?? w);
  // "…, FL 33407" and "…, FL" are the same address; a ZIP (or ZIP+4, whose
  // "-1234" splits into its own token) is only dropped at the END so a leading
  // 5-digit house number is never touched.
  const last = () => words[words.length - 1];
  if (words.length > 2 && /^\d{4}$/.test(last()) && /^\d{5}$/.test(words[words.length - 2])) {
    words.pop(); // the +4 of a ZIP+4
  }
  if (words.length > 1 && /^\d{5}$/.test(last())) {
    words.pop();
  }
  return words.join(" ");
}
