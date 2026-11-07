import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { HR_MODULES, HR_MODULE_OF, inModule, moduleOf } from "../lib/hr-modules.ts";

const source = fs.readFileSync(new URL("../app/Joblink.tsx", import.meta.url), "utf8");
const menu = source.slice(source.indexOf("const hrNav = ["), source.indexOf("const adminNav"));
const ids = [...menu.matchAll(/id: "(hr-[a-z-]+)"/g)].map((m) => m[1]);

test("every section of the employer menu belongs to a program", () => {
  assert.ok(ids.length >= 20);
  for (const id of ids) assert.ok(id in HR_MODULE_OF, `${id} has no program`);
  for (const id of Object.keys(HR_MODULE_OF)) assert.ok(ids.includes(id), `${id} is not in the menu`);
});

test("recruitment and HR operations each have their own sections, and the shared ones show in both", () => {
  const of = (mode) => ids.filter((id) => inModule(id, mode));
  assert.ok(of("recruit").includes("hr-jobs") && of("recruit").includes("hr-candidates") && of("recruit").includes("hr-interviews"));
  assert.ok(of("ops").includes("hr-employees") && of("ops").includes("hr-payroll") && of("ops").includes("hr-attendance") && of("ops").includes("hr-orders") && of("ops").includes("hr-planfact"));
  assert.ok(!of("recruit").includes("hr-payroll") && !of("recruit").includes("hr-planfact") && !of("ops").includes("hr-candidates"));
  for (const shared of ["hr-overview", "hr-approvals", "hr-team", "hr-company"]) assert.ok(of("recruit").includes(shared) && of("ops").includes(shared), shared);
  // nothing is lost: every section is in at least one menu
  for (const id of ids) assert.ok(inModule(id, "recruit") || inModule(id, "ops"), id);
});

test("each program has a home that is one of its own pages, and an unknown page counts as shared", () => {
  for (const mode of Object.keys(HR_MODULES)) assert.ok(inModule(HR_MODULES[mode].home, mode) && ids.includes(HR_MODULES[mode].home));
  assert.equal(moduleOf("hr-something-new"), "both");
});

test("the holding (group) section is kept in the code but hidden from the menu", async () => {
  const { HIDDEN_HR_PAGES } = await import("../lib/hr-modules.ts");
  assert.ok(HIDDEN_HR_PAGES.has("hr-group"));
  assert.ok(ids.includes("hr-group"));
});
