import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { GUIDE, GUIDE_AUDIENCES, GUIDE_FAQ } from "../lib/guide-content.ts";

const nav = fs.readFileSync(new URL("../app/Joblink.tsx", import.meta.url), "utf8");
const labels = new Set([...nav.matchAll(/\{ id: "[a-z-]+", label: "([^"]+)"/g)].map((m) => m[1]));

test("every menu name the guide mentions exists in the navigation", () => {
  const missing = GUIDE.flatMap((s) => s.where.filter((w) => !labels.has(w)).map((w) => `${s.id}: ${w}`));
  assert.deepEqual(missing, []);
});
test("every audience has sections, ids are unique, every section has steps", () => {
  const ids = GUIDE.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of GUIDE_AUDIENCES) assert.ok(GUIDE.some((s) => s.audience === a.id), `no section for ${a.id}`);
  for (const s of GUIDE) assert.ok(s.steps.length >= 2 && s.title && s.summary, s.id);
  assert.ok(GUIDE_FAQ.length >= 4);
});
test("the guide page is reachable from the three navigations", () => {
  for (const id of ["guide", "hr-guide", "admin-guide"]) assert.ok(nav.includes(`id: "${id}", label: "İstifadə təlimatı"`), id);
});
