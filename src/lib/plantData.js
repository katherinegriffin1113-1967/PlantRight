// PlantRight — derived gardening detail for a recommended plant.
//
// Everything here is computed on the client from data the saved plan already
// carries: each recommendation's tags (life, type, size, sun, water,
// flowering) and the plan's frost dates. That keeps these features off the
// edge function — no redeploy, no new data fetch — and lets the plant-detail
// modal answer the three questions gardeners actually ask:
//
//   "When do I plant it?"      → plantingCalendar()   (Phase 1)
//   "What grows well with it?" → companionInfo()      (Phase 2)
//   "How do I look after it?"  → careInfo()           (Phase 2)
//
// The timing and companion values are typical horticultural guidance, not
// promises for a specific yard — the copy says "around" and "typically" on
// purpose. They're a sensible starting dataset worth a green thumb's review.

// ----------------------------------------------------------------------------
// Frost-date math
// ----------------------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Frost dates arrive as "April 15" / "October 25" (month name + day, no year),
// or empty when the scrape didn't find them. Parse to a day-of-year we can do
// arithmetic on, using a fixed non-leap reference year.
function parseFrost(text) {
  if (!text) return null;
  const m = /([A-Za-z]+)\s+(\d{1,2})/.exec(text);
  if (!m) return null;
  const month = MONTHS.findIndex(
    (name) => name.toLowerCase() === m[1].toLowerCase()
  );
  const day = Number(m[2]);
  if (month < 0 || day < 1 || day > 31) return null;
  return new Date(2001, month, day);
}

function shift(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(date) {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

// ----------------------------------------------------------------------------
// Planting calendar
// ----------------------------------------------------------------------------

// Timing for the annual edibles, where frost-relative planting genuinely
// matters. `indoors` = weeks before the last spring frost to start seeds
// indoors (0 = sow straight in the ground); `out` = weeks relative to the last
// frost to plant out (negative = cool-season, before the frost); `maturity` =
// typical days from planting out to first harvest.
const TIMING = {
  "Tomato (early variety)": { indoors: 6, out: 1, maturity: 60 },
  "Cherry Tomato": { indoors: 6, out: 1, maturity: 60 },
  "Bell Pepper": { indoors: 8, out: 2, maturity: 70 },
  "Jalapeño Pepper": { indoors: 8, out: 2, maturity: 70 },
  "Zucchini": { indoors: 0, out: 1, maturity: 50 },
  "Cucumber": { indoors: 0, out: 1, maturity: 55 },
  "Bush Beans": { indoors: 0, out: 1, maturity: 55 },
  "Pole Beans": { indoors: 0, out: 1, maturity: 65 },
  "Okra": { indoors: 0, out: 2, maturity: 55 },
  "Sweet Potatoes": { indoors: 0, out: 2, maturity: 100 },
  "Winter Squash": { indoors: 0, out: 1, maturity: 90 },
  "Eggplant": { indoors: 8, out: 2, maturity: 75 },
  "Basil": { indoors: 6, out: 1, maturity: 60 },
  "Leaf Lettuce": { indoors: 0, out: -3, maturity: 45 },
  "Spinach": { indoors: 0, out: -4, maturity: 40 },
  "Kale": { indoors: 4, out: -3, maturity: 55 },
  "Swiss Chard": { indoors: 0, out: -2, maturity: 55 },
  "Carrots": { indoors: 0, out: -2, maturity: 70 },
  "Radishes": { indoors: 0, out: -3, maturity: 28 },
  "Beets": { indoors: 0, out: -3, maturity: 55 },
  "Broccoli": { indoors: 5, out: -3, maturity: 65 },
  "Sugar Snap Peas": { indoors: 0, out: -4, maturity: 60 },
  "Onions": { indoors: 0, out: -4, maturity: 100 },
  "Cilantro": { indoors: 0, out: -2, maturity: 50 },
  "Flat-leaf Parsley": { indoors: 6, out: -2, maturity: 70 },
  "Dill": { indoors: 0, out: 0, maturity: 55 },
};

// Garlic is the odd one out: planted in fall, harvested the next summer.
const FALL_PLANTED = new Set(["Garlic"]);

// Returns an ordered list of { label, value } steps for the plant, or a single
// general step when we have no frost dates or no crop-specific timing.
export function plantingCalendar(plant, plan) {
  const name = plant?.name;
  const lastFrost = parseFrost(plan?.last_frost);
  const firstFrost = parseFrost(plan?.first_frost);

  if (FALL_PLANTED.has(name)) {
    const plantBy = firstFrost ? fmt(shift(firstFrost, -35)) : "early-to-mid fall";
    return {
      steps: [
        { label: "Plant cloves", value: `Around ${plantBy}, a few weeks before the ground freezes` },
        { label: "Harvest", value: "The following mid-summer, once the lower leaves brown" },
      ],
    };
  }

  const timing = TIMING[name];

  // Annual edible with known timing and a real last-frost date: give dates.
  if (timing && lastFrost) {
    const steps = [];
    if (timing.indoors > 0) {
      steps.push({
        label: "Start seeds indoors",
        value: `Around ${fmt(shift(lastFrost, -timing.indoors * 7))}`,
      });
    }
    const plantOut = shift(lastFrost, timing.out * 7);
    steps.push({
      label: timing.indoors > 0 ? "Transplant outside" : "Sow outdoors",
      value:
        timing.out < 0
          ? `Around ${fmt(plantOut)}, a few weeks before your last frost`
          : timing.out === 0
            ? `Around ${fmt(plantOut)}, at your last spring frost`
            : `Around ${fmt(plantOut)}, once frost danger has passed`,
    });
    steps.push({
      label: "First harvest",
      value: `About ${timing.maturity} days later, around ${fmt(shift(plantOut, timing.maturity))}`,
    });
    return { steps };
  }

  // Annual edible but no frost date to anchor to: describe the window.
  if (timing) {
    const coolSeason = timing.out < 0;
    return {
      steps: [
        {
          label: "When to plant",
          value: coolSeason
            ? "A few weeks before your last spring frost — it likes cool weather."
            : "After your last spring frost, once nights stay warm.",
        },
        { label: "First harvest", value: `About ${timing.maturity} days after planting.` },
      ],
    };
  }

  // Everything else — perennials, shrubs, trees, most flowers. These go in as
  // plants, not seeds, so the useful advice is the planting window.
  const woody = plant?.life !== "annual";
  const anchor = lastFrost ? ` (around ${fmt(lastFrost)})` : "";
  return {
    steps: [
      {
        label: "Best planting time",
        value: woody
          ? `Spring after your last frost${anchor}, or early fall — cooler weather lets roots settle before heat or hard freeze.`
          : `After your last spring frost${anchor}, once the soil has warmed.`,
      },
    ],
  };
}

// ----------------------------------------------------------------------------
// Companion planting
// ----------------------------------------------------------------------------

// Companion advice works at the group level, not plant-by-plant, so each edible
// is mapped to a group and each group gets one honest blurb. Non-edibles fall
// through to a pollinator/tidy-neighbor note.
const COMPANION_GROUP = {
  "Tomato (early variety)": "tomato", "Cherry Tomato": "tomato",
  "Bell Pepper": "nightshade", "Jalapeño Pepper": "nightshade", "Eggplant": "nightshade",
  "Bush Beans": "bean", "Pole Beans": "bean", "Sugar Snap Peas": "pea",
  "Kale": "brassica", "Broccoli": "brassica",
  "Onions": "allium", "Garlic": "allium", "Chives": "allium",
  "Carrots": "root", "Beets": "root", "Radishes": "root",
  "Leaf Lettuce": "leafy", "Spinach": "leafy", "Swiss Chard": "leafy",
  "Cucumber": "cucurbit", "Zucchini": "cucurbit", "Winter Squash": "cucurbit",
  "Basil": "herb", "Cilantro": "herb", "Dill": "herb", "Flat-leaf Parsley": "herb",
  "Marigolds": "protector", "Nasturtiums": "protector",
};

const COMPANION_BLURB = {
  tomato: {
    good: "Basil, marigolds, carrots and onions",
    avoid: "Cabbage-family crops (kale, broccoli), fennel and potatoes",
  },
  nightshade: {
    good: "Basil, onions and marigolds",
    avoid: "Fennel, and keep away from beans",
  },
  bean: {
    good: "Cucumbers, squash, carrots and corn",
    avoid: "Onions, garlic and chives",
  },
  pea: {
    good: "Carrots, radishes and lettuce",
    avoid: "Onions, garlic and chives",
  },
  brassica: {
    good: "Onions, aromatic herbs like dill, and beets",
    avoid: "Tomatoes and strawberries",
  },
  allium: {
    good: "Carrots, tomatoes and cabbage-family crops",
    avoid: "Beans and peas",
  },
  root: {
    good: "Onions, lettuce and peas",
    avoid: "Dill can stunt carrots — keep it apart",
  },
  leafy: {
    good: "Carrots, radishes and onions",
    avoid: "Nothing fussy — a friendly neighbor to most beds",
  },
  cucurbit: {
    good: "Beans, nasturtiums and radishes",
    avoid: "Strong aromatic herbs like sage",
  },
  herb: {
    good: "Most vegetables — many herbs deter pests and lift flavor",
    avoid: "Give mint its own pot; it spreads aggressively",
  },
  protector: {
    good: "Almost everything — often planted to deter pests",
    avoid: "No real foes; tuck them anywhere",
  },
};

export function companionInfo(plant) {
  const group = COMPANION_GROUP[plant?.name];
  if (group) return COMPANION_BLURB[group];
  if (isPollinatorFriendly(plant)) {
    return {
      good: "Pairs happily with other blooms and pollinator plants",
      avoid: null,
    };
  }
  return null;
}

// ----------------------------------------------------------------------------
// Care detail
// ----------------------------------------------------------------------------

const SPACING = {
  small: "6–12 in apart",
  medium: "18–24 in apart",
  large: "3 ft or more apart",
};

const WATERING = {
  low: "Water deeply now and then; let it dry between drinks once established.",
  medium: "Aim for about an inch of water a week, more in a heat wave.",
  high: "Keep the soil consistently moist — likely every day or two in summer.",
};

const SUN_CARE = {
  full: "Give it a spot with 6+ hours of direct sun.",
  part: "Happiest in part sun — morning light with afternoon shade.",
  shade: "Keep it out of harsh afternoon sun; it prefers shade.",
};

// A short "watch for" note for the plants gardeners most often ask about.
const WATCH = {
  tomato: "Watch for hornworms and early blight; mulch to keep soil off leaves.",
  nightshade: "Watch for aphids and flea beetles on young plants.",
  brassica: "Cabbage worms are the main pest — check leaf undersides.",
  cucurbit: "Powdery mildew and squash bugs are common in late summer.",
  rose: "Aphids and black spot; give good airflow and water at the roots.",
};

const WATCH_BY_NAME = {
  "Knock Out Rose": "rose",
  "Tomato (early variety)": "tomato",
  "Cherry Tomato": "tomato",
};

export function careInfo(plant) {
  if (!plant?.size) return null;
  const group = COMPANION_GROUP[plant.name];
  const watchKey = WATCH_BY_NAME[plant.name] || group;
  return {
    spacing: SPACING[plant.size] || null,
    watering: WATERING[plant.water] || null,
    sun: SUN_CARE[plant.sun] || null,
    watch: (watchKey && WATCH[watchKey]) || null,
  };
}

// ----------------------------------------------------------------------------
// Pollinator flag (used for a badge now; the matching filter is a later step)
// ----------------------------------------------------------------------------

const POLLINATOR_TYPES = new Set(["flower", "herb", "shrub", "tree", "vine", "groundcover"]);

export function isPollinatorFriendly(plant) {
  return Boolean(plant?.flowering && POLLINATOR_TYPES.has(plant?.type));
}
