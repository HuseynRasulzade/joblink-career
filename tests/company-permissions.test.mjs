import test from "node:test";
import assert from "node:assert/strict";
import { can, permissionsOf, permissionForPath, GRANTABLE, ROLE_PRESETS, normalizeGrants, PERMISSION_INFO, PERMISSION_GROUPS } from "../lib/company.ts";

const NEW = ["employees", "staff", "orders", "attendance", "documents", "personal-data"];

test("owner, director and HR keep everything they did; lower roles get nothing new by themselves", () => {
  for (const role of ["owner", "director", "hr"]) for (const p of NEW) assert.equal(can(role, p), true, `${role} ${p}`);
  for (const role of ["manager", "recruiter"]) for (const p of NEW) assert.equal(can(role, p), false, `${role} ${p}`);
  assert.deepEqual(permissionsOf("manager"), ["reports"]);
});

test("the journal stays with owner and director, others get it as a grant", () => {
  assert.equal(can("owner", "audit"), true);
  assert.equal(can("director", "audit"), true);
  assert.equal(can("hr", "audit"), false);
  assert.equal(can("hr", "audit", ["audit"]), true);
});

test("a grant opens one permission only", () => {
  assert.equal(can("recruiter", "staff", ["staff"]), true);
  assert.equal(can("recruiter", "orders", ["staff"]), false);
  assert.equal(can("manager", "salaries", ["salaries"]), true);
  assert.equal(can("manager", "team", ["team"]), false);
  assert.equal(can("manager", "approve-director", ["approve-director"]), false);
  assert.deepEqual(normalizeGrants(["staff", "team", "approve-director", "bogus", "staff"]), ["staff"]);
});

test("the grantable list is wide, grouped and keeps the dangerous ones with the roles", () => {
  const ids = GRANTABLE.map((g) => g.id);
  for (const id of [...NEW.filter((p) => p !== "x"), "publish", "offers", "tests", "reports", "salaries", "billing", "company-profile", "approve-hr"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("team") && !ids.includes("approve-director"));
  assert.ok(GRANTABLE.length >= 15);
  assert.ok(GRANTABLE.every((g) => g.group && g.description && g.label));
  assert.ok(PERMISSION_GROUPS.length >= 3);
  assert.equal(new Set(PERMISSION_INFO.map((p) => p.id)).size, PERMISSION_INFO.length);
});

test("presets use grantable permissions only", () => {
  const ids = new Set(GRANTABLE.map((g) => g.id));
  assert.ok(ROLE_PRESETS.length >= 10);
  for (const preset of ROLE_PRESETS) for (const g of preset.grants) assert.ok(ids.has(g), `${preset.id} ${g}`);
});

test("HR endpoints are guarded by the permission of their section", () => {
  assert.equal(permissionForPath("company/staff"), "staff");
  assert.equal(permissionForPath("company/staff/save"), "staff");
  assert.equal(permissionForPath("company/structure/add-many"), "staff");
  assert.equal(permissionForPath("company/org-names"), "staff");
  assert.equal(permissionForPath("company/headcount/save"), "staff");
  assert.equal(permissionForPath("company/orders/save"), "orders");
  assert.equal(permissionForPath("company/order-signers"), "orders");
  assert.equal(permissionForPath("company/applications/save"), "orders");
  // the approvals page keeps its own endpoints
  assert.equal(permissionForPath("company/requests/decide"), "salaries");
  assert.equal(permissionForPath("company/attendance/set"), "attendance");
  assert.equal(permissionForPath("company/calendar"), "attendance");
  assert.equal(permissionForPath("company/employee-docs/upload"), "documents");
  assert.equal(permissionForPath("company/employee-doc"), "documents");
  assert.equal(permissionForPath("company/employees/profile"), "personal-data");
  assert.equal(permissionForPath("company/employees/profile-import"), "personal-data");
  assert.equal(permissionForPath("company/attendance/import"), "attendance");
  assert.equal(permissionForPath("company/calendar/import"), "attendance");
  assert.equal(permissionForPath("company/employees/save"), "employees");
  assert.equal(permissionForPath("company/employees/import"), "employees");
  assert.equal(permissionForPath("company/employee-tasks/add"), "employees");
  assert.equal(permissionForPath("company/salary-calc"), "salaries");
  assert.equal(permissionForPath("company/something-else"), "salaries");
});
