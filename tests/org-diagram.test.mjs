import test from "node:test";
import assert from "node:assert/strict";
import { layoutOrg, ORG } from "../lib/org-diagram.ts";

const person = (id, name, department, section = "", status = "active") => ({ id, name, position: "Mütəxəssis", department, section, status });
const staff = [
  person("1", "Aysel", "Maliyyə", "Mühasibat"),
  person("2", "Namizəd", "Maliyyə", "Mühasibat"),
  person("3", "Orxan", "Maliyyə", "Nazirlik"),
  person("4", "Nigar", "IT"),
  person("5", "Elnur", "IT"),
  person("6", "Çıxan", "IT", "", "left"),
];

test("the diagram has the company, the departments, the sections that exist and every active person once", () => {
  const { nodes } = layoutOrg(staff, "Şirkət A");
  const kinds = (k) => nodes.filter((n) => n.kind === k);
  assert.equal(kinds("root").length, 1);
  assert.equal(kinds("root")[0].title, "Şirkət A");
  assert.deepEqual(kinds("dept").map((n) => n.title), ["IT", "Maliyyə"]);
  assert.deepEqual(kinds("section").map((n) => n.title), ["Mühasibat", "Nazirlik"]);
  assert.equal(kinds("person").length, 5);
  assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length);
});

test("no two cards overlap and everything stays inside the canvas", () => {
  const { nodes, width, height } = layoutOrg(staff, "Şirkət A");
  for (const n of nodes) {
    assert.ok(n.x >= 0 && n.y >= 0 && n.x + n.w <= width && n.y + n.h <= height, n.id);
  }
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${a.id} overlaps ${b.id}`);
    }
});

test("every card but the first is reached by exactly one arrow, from a card above it", () => {
  const { nodes, edges } = layoutOrg(staff, "Şirkət A");
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes.filter((x) => x.kind !== "root")) {
    const incoming = edges.filter((e) => e.to === n.id);
    assert.equal(incoming.length, 1, n.id);
    assert.ok(byId.get(incoming[0].from).y < n.y, n.id);
  }
  for (const e of edges) assert.ok(byId.has(e.from) && byId.has(e.to));
});

test("a parent is centred over its children", () => {
  const { nodes, edges } = layoutOrg(staff, "Şirkət A");
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const centre = (n) => n.x + n.w / 2;
  const root = nodes.find((n) => n.kind === "root");
  const depts = edges.filter((e) => e.from === "root").map((e) => byId.get(e.to));
  assert.ok(Math.abs(centre(root) - (centre(depts[0]) + centre(depts[depts.length - 1])) / 2) < 1);
  const maliyye = byId.get("dept:Maliyyə");
  const sections = edges.filter((e) => e.from === maliyye.id).map((e) => byId.get(e.to));
  assert.ok(Math.abs(centre(maliyye) - (centre(sections[0]) + centre(sections[1])) / 2) < 1);
});

test("a department without sections puts its people straight under it, in a column", () => {
  const { nodes, edges } = layoutOrg(staff, "Şirkət A");
  const it = nodes.find((n) => n.id === "dept:IT");
  const first = edges.find((e) => e.from === it.id);
  assert.equal(first.to.startsWith("person:"), true);
  assert.ok(first.arrow);
  const column = nodes.filter((n) => n.kind === "person" && ["person:4", "person:5"].includes(n.id));
  assert.equal(column[0].x, column[1].x);
  assert.equal(column[1].y - column[0].y, ORG.personH + ORG.personGap);
});

test("collapsing a department hides everything under it and narrows the picture", () => {
  const open = layoutOrg(staff, "Şirkət A");
  const shut = layoutOrg(staff, "Şirkət A", new Set(["dept:Maliyyə"]));
  assert.ok(!shut.nodes.some((n) => n.id.startsWith("section:Maliyyə") || ["person:1", "person:2", "person:3"].includes(n.id)));
  assert.ok(shut.nodes.some((n) => n.id === "dept:Maliyyə"));
  assert.ok(shut.width < open.width);
});

test("an empty company still draws the company card", () => {
  const { nodes, width } = layoutOrg([], "Boş");
  assert.equal(nodes.length, 1);
  assert.ok(width > 0);
});
