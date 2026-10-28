import test from "node:test";
import assert from "node:assert/strict";
import { pickSigners, isCompanyDirector, sameName } from "../lib/order-signers.ts";

const person = (id, name, position, department, section = "", status = "active") => ({ id, name, position, department, section, status });
const people = [
  person("1", "Aysel Məmmədova", "Mühasib", "Maliyyə", "Mühasibat"),
  person("2", "Rəşad Quliyev", "Mühasibat şöbəsinin müdiri", "Maliyyə", "Mühasibat"),
  person("3", "Nigar Əliyeva", "Maliyyə direktoru", "Maliyyə", ""),
  person("4", "Elçin Hüseynov", "Baş direktor", "İdarə", ""),
  person("5", "Orxan Əliyev", "Şöbə müdiri", "Maliyyə", "Büdcə", "left"),
];

test("the head is the section's manager, the director comes from the staff list", () => {
  const { head, director } = pickSigners({ id: "1", department: "Maliyyə", section: "Mühasibat" }, people, "Profil Direktor");
  assert.equal(head?.name, "Rəşad Quliyev");
  assert.equal(director?.name, "Elçin Hüseynov");
  assert.equal(director?.source, "staff");
});

test("with no head in the section the department's head is used; a finance director is not the company director", () => {
  const { head, director } = pickSigners({ id: "9", department: "Maliyyə", section: "Büdcə" }, people.filter((p) => p.id !== "4"), "Profil Direktor");
  assert.equal(head?.name, "Nigar Əliyeva");
  assert.equal(director?.name, "Profil Direktor");
  assert.equal(director?.source, "profile");
});

test("a person is never their own head, and nobody is picked when nobody fits", () => {
  const { head } = pickSigners({ id: "2", department: "Maliyyə", section: "Mühasibat" }, people.filter((p) => p.id !== "3"), "");
  assert.equal(head, null);
  assert.equal(pickSigners({ id: "x", department: "IT", section: "" }, [], "").director, null);
});

test("company director titles and name comparison", () => {
  assert.ok(isCompanyDirector("Direktor") && isCompanyDirector("Baş direktor") && isCompanyDirector("CEO"));
  assert.ok(!isCompanyDirector("Maliyyə direktoru") && !isCompanyDirector("Direktor müavini"));
  assert.ok(sameName("Əli Əliyev", "ƏLİ ƏLİYEV"));
  assert.ok(!sameName("", ""));
});
