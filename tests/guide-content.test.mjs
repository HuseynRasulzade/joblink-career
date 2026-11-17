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

import { groupNav, HR_NAV_GROUPS } from "../lib/nav-groups.ts";
test("nav groups keep every item exactly once, overview first, loose items last", () => {
  const ids = ["hr-overview", "hr-jobs", "hr-ai", "hr-interviews", "hr-employees", "hr-payroll", "hr-team", "hr-calculator", "hr-messages", "hr-support"];
  const out = groupNav(ids.map((id) => ({ id })));
  const flat = out.flatMap((e) => e.items.map((i) => i.id));
  assert.deepEqual([...flat].sort(), [...ids].sort());
  assert.equal(out[0].group, null); assert.deepEqual(out[0].items.map((i) => i.id), ["hr-overview"]);
  assert.equal(out.at(-1).group, null); assert.ok(out.at(-1).items.some((i) => i.id === "hr-support"));
  assert.deepEqual(out.find((e) => e.group?.id === "hire").items.map((i) => i.id), ["hr-jobs", "hr-ai"]);
  // every id a group names exists in the real menu
  const nav = fs.readFileSync(new URL("../app/Joblink.tsx", import.meta.url), "utf8");
  for (const g of HR_NAV_GROUPS) for (const id of g.ids) assert.ok(nav.includes(`id: "${id}"`), id);
});
