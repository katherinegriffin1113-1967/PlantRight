// deno test — the catalog matcher: zone safety, relaxation, diversity, and
// the returned-copies guarantee that keeps local notes from leaking between
// warm invocations.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { CATALOG, matchPlants, type Preferences } from "./plants.ts";

const NO_PREFS: Preferences = {
  types: [],
  life: "any",
  size: "any",
  flowering: "any",
  sun: "any",
  water: "any",
  pollinator: "any",
};

Deno.test("every pick survives the requested zone", () => {
  for (const zone of [3, 5, 7, 9, 11]) {
    const { plants } = matchPlants(zone, NO_PREFS);
    assert(plants.length > 0, `zone ${zone} returned nothing`);
    for (const p of plants) {
      assert(
        zone >= p.zones[0] && zone <= p.zones[1],
        `${p.name} [${p.zones}] recommended outside zone ${zone}`
      );
    }
  }
});

Deno.test("an impossible ask relaxes instead of returning nothing", () => {
  // Shade + large + low-water + flowering vegetables in zone 3 matches nothing.
  const { plants, relaxed } = matchPlants(3, {
    ...NO_PREFS,
    types: ["vegetable"],
    size: "large",
    sun: "shade",
    water: "low",
    flowering: "yes",
  });
  assert(plants.length >= 4, "relaxation should find at least 4 plants");
  assert(relaxed.length > 0, "dropped constraints must be reported");
});

Deno.test("satisfying answers exist → nothing is relaxed", () => {
  const { relaxed } = matchPlants(7, { ...NO_PREFS, types: ["vegetable"] });
  assertEquals(relaxed, []);
});

Deno.test("picks are spread across plant types", () => {
  const { plants } = matchPlants(7, NO_PREFS, 12);
  const types = new Set(plants.map((p) => p.type));
  assert(types.size >= 3, `expected variety, got only: ${[...types]}`);
});

Deno.test("returned plants are copies, not shared catalog rows", () => {
  const { plants } = matchPlants(7, NO_PREFS);
  const pick = plants[0] as { name: string; localNote?: string };
  pick.localNote = "MUTATED";
  const inCatalog = CATALOG.find((p) => p.name === pick.name) as {
    localNote?: string;
  };
  assertEquals(inCatalog.localNote, undefined);
  // A second call must come back clean too.
  const again = matchPlants(7, NO_PREFS).plants.find(
    (p) => p.name === pick.name
  ) as { localNote?: string };
  assertEquals(again?.localNote, undefined);
});
