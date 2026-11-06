import test from "node:test";
import assert from "node:assert/strict";
import { checkDestination, domesticPlaces, foreignPlaces } from "../lib/trip-places.ts";
import { FOREIGN_NORMS, lookupNorm } from "../lib/trip-norms.ts";

test("inside the country: the four named cities and 'other', with the norm of each", () => {
  const places = domesticPlaces();
  assert.deepEqual(places.map((p) => p.value), ["Bakı şəhəri", "Naxçıvan şəhəri", "Gəncə şəhəri", "Sumqayıt şəhəri", ""]);
  assert.match(places[0].label, /125 AZN/);
  assert.match(places[4].label, /90 AZN/);
});

test("abroad: every country of the decision's table is offered, and cities with a rate of their own", () => {
  const places = foreignPlaces();
  for (const n of FOREIGN_NORMS) assert.ok(places.some((p) => p.value === n.country), n.country);
  assert.ok(places.length > FOREIGN_NORMS.length);
  assert.ok(places.some((p) => p.value === "Rusiya Federasiyası, Moskva və Sankt-Peterburq şəhərləri"));
  assert.ok(FOREIGN_NORMS.length >= 100);
});

test("every offered foreign place is accepted by the server check and finds its own norm", () => {
  for (const place of foreignPlaces()) {
    const check = checkDestination(place.value, true);
    assert.equal(check.ok, true, place.value);
    const found = lookupNorm(place.value, true);
    assert.equal(found.kind, "foreign", place.value);
    assert.ok(place.value.startsWith(found.country), place.value);
  }
});

test("every offered named domestic city is accepted and is not taken as foreign", () => {
  for (const place of domesticPlaces().filter((p) => p.value)) assert.deepEqual(checkDestination(place.value, false), { ok: true, abroad: false });
});

test("a foreign trip to a place that is not in the table is refused", () => {
  assert.equal(checkDestination("Bakı şəhəri", true).ok, false);
  assert.equal(checkDestination("Atlantida", true).ok, false);
  assert.equal(checkDestination("", true).ok, false);
  assert.match(checkDestination("Atlantida", true).error, /cədvəlindəki/);
});

test("another place inside the country is accepted, and a foreign place typed as domestic is taken as foreign", () => {
  assert.deepEqual(checkDestination("Şəki", false), { ok: true, abroad: false });
  assert.deepEqual(checkDestination("Quba rayonu", false), { ok: true, abroad: false });
  assert.deepEqual(checkDestination("İstanbul", false), { ok: true, abroad: true });
  assert.equal(checkDestination(" ", false).ok, false);
});
