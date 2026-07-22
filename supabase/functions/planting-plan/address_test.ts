// deno test — address canonicalization for the per-plan address limit.
import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { normalizeAddress } from "./address.ts";

Deno.test("phrasing variants of one address collapse to one key", () => {
  const a = normalizeAddress("123 Main Street, Springfield, IL");
  assertEquals(normalizeAddress("123 Main St Springfield IL"), a);
  assertEquals(normalizeAddress("  123  MAIN   st., Springfield,   IL  "), a);
  assertEquals(normalizeAddress("123 Main Street, Springfield, IL, USA"), a);
});

Deno.test("a trailing ZIP never makes a new address", () => {
  assertEquals(
    normalizeAddress("519 27th Street, West Palm Beach, FL 33407"),
    normalizeAddress("519 27th Street, West Palm Beach, FL")
  );
  assertEquals(
    normalizeAddress("519 27th St, West Palm Beach, FL 33407-1234"),
    normalizeAddress("519 27th street west palm beach fl")
  );
});

Deno.test("a leading 5-digit house number is preserved", () => {
  const a = normalizeAddress("10250 Santa Monica Blvd, Los Angeles, CA");
  assertEquals(a.startsWith("10250 "), true);
  // A bare 5-digit ZIP typed alone must not normalize to empty.
  assertEquals(normalizeAddress("33407"), "33407");
});

Deno.test("directionals and road types are canonicalized", () => {
  assertEquals(
    normalizeAddress("42 North Oak Avenue"),
    normalizeAddress("42 N Oak Ave")
  );
  assertNotEquals(
    normalizeAddress("42 N Oak Ave"),
    normalizeAddress("42 S Oak Ave")
  );
});

Deno.test("different addresses stay different", () => {
  assertNotEquals(
    normalizeAddress("123 Main St, Springfield, IL"),
    normalizeAddress("125 Main St, Springfield, IL")
  );
  assertNotEquals(
    normalizeAddress("Denver, Colorado"),
    normalizeAddress("Austin, Texas")
  );
});
