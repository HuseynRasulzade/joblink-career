import test from "node:test";
import assert from "node:assert/strict";
import { DOMESTIC_NORMS, FOREIGN_NORMS, azNPerDay, domesticParts, lookupNorm } from "../lib/trip-norms.ts";

test("the table has the 106 positions of the annex and every figure is a number", () => {
  assert.equal(FOREIGN_NORMS.length, 106);
  assert.deepEqual(FOREIGN_NORMS.map((n) => n.n), Array.from({ length: 106 }, (_, i) => i + 1));
  assert.ok(FOREIGN_NORMS.every((n) => n.norm > 0 && ["USD", "EUR", "GBP", "JPY"].includes(n.currency)));
  assert.equal(FOREIGN_NORMS.find((n) => n.country === "Yaponiya").norm, 40000);
});

test("domestic norms follow the city: Baku 125, Nakhchivan 100, Ganja and Sumgait 95, anywhere else 90", () => {
  assert.equal(lookupNorm("Bakı").amount, 125);
  assert.equal(lookupNorm("Naxçıvan şəhəri").amount, 100);
  assert.equal(lookupNorm("Gəncə").amount, 95);
  assert.equal(lookupNorm("Sumqayıt").amount, 95);
  assert.equal(lookupNorm("Şəki").amount, 90);
  assert.equal(lookupNorm("Lənkəran rayonu").kind, "domestic");
  assert.equal(DOMESTIC_NORMS.length, 4);
});

test("the hotel is 70 percent of a domestic norm and half of it is paid without documents", () => {
  assert.deepEqual(domesticParts(100), { hotel: 70, daily: 30, noReceipt: 65 });
  assert.equal(lookupNorm("Bakı").hotel, 87.5);
});

test("a foreign place is found by country, by a city with its own figure and by common English names", () => {
  const ru = lookupNorm("Rusiya");
  assert.deepEqual([ru.kind, ru.amount, ru.currency], ["foreign", 170, "USD"]);
  assert.equal(lookupNorm("Moskva").amount, 260);
  assert.equal(lookupNorm("Sankt-Peterburq").amount, 260);
  const tr = lookupNorm("İstanbul");
  assert.deepEqual([tr.amount, tr.currency, tr.country], [220, "EUR", "Türkiyə"]);
  assert.equal(lookupNorm("Ankara").amount, 200);
  assert.equal(lookupNorm("Türkiyə").amount, 180);
  assert.equal(lookupNorm("Antalya").amount, 180);
  assert.equal(lookupNorm("Dubai").amount, 280);
  assert.equal(lookupNorm("New York").amount, 450);
  assert.equal(lookupNorm("Berlin, Almaniya").amount, 250);
  assert.equal(lookupNorm("London").currency, "GBP");
  assert.equal(lookupNorm("Tokyo").currency, "JPY");
});

test("an unknown place is domestic unless the trip is marked foreign, then there is no figure", () => {
  assert.equal(lookupNorm("Quba").kind, "domestic");
  assert.equal(lookupNorm("Atlantis", true), null);
  assert.equal(lookupNorm(""), null);
  assert.equal(lookupNorm("Ağdam").kind, "domestic");
});

test("a foreign norm becomes AZN only with the rate of its currency", () => {
  const ist = lookupNorm("İstanbul");
  assert.equal(azNPerDay(ist, {}), null);
  assert.equal(azNPerDay(ist, { EUR: 2 }), 440);
  assert.equal(azNPerDay(lookupNorm("Bakı"), {}), 125);
});
