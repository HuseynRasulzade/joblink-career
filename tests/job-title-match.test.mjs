import test from "node:test";
import assert from "node:assert/strict";
import { bestCatalogMatch } from "../lib/job-title-match.ts";

test("an exact catalog title and its spelling variants resolve to the catalog", () => {
  assert.equal(bestCatalogMatch("Mühasib").how, "exact");
  assert.equal(bestCatalogMatch("accountant").how, "exact");
  assert.equal(bestCatalogMatch("MÜHASİB").how, "exact");
});

test("a typo or another word order finds the catalog title", () => {
  const typo = bestCatalogMatch("Muhasibb");
  assert.ok(typo, "typo");
  assert.match(typo.title.label, /ühasib/);
  const order = bestCatalogMatch("mühasib baş");
  assert.ok(order, "order");
  assert.match(order.title.label, /ühasib/);
});

test("a title the catalog does not have is not forced onto another one", () => {
  assert.equal(bestCatalogMatch("Kosmik gəmi kapitanı köməkçisi"), null);
  assert.equal(bestCatalogMatch("ab"), null);
  assert.equal(bestCatalogMatch("Xəzinə mütəxəssisi üzrə təlimatçı"), null);
});
