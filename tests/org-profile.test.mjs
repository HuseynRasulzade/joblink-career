import test from "node:test";
import assert from "node:assert/strict";
import { canonicalOrgName, uniqueOrgNames, orgKey } from "../lib/org-names.ts";
import { normalizeProfile, validIban, ageOn, idExpiresSoon, parseProfile } from "../lib/employee-profile.ts";

test("one spelling per department name", () => {
  assert.equal(orgKey("  İT   şöbəsi "), orgKey("it ŞÖBƏSİ".replace("it", "İt")));
  assert.deepEqual(canonicalOrgName(["Maliyyə"], "  maliyyə "), { name: "Maliyyə", existing: true });
  assert.deepEqual(canonicalOrgName(["Maliyyə"], "Hüquq  şöbəsi"), { name: "Hüquq şöbəsi", existing: false });
  assert.deepEqual(canonicalOrgName([], "   "), { name: "", existing: false });
  assert.deepEqual(uniqueOrgNames(["Satış", "satış", " Maliyyə ", ""]), ["Maliyyə", "Satış"]);
});

test("IBAN check digits", () => {
  assert.equal(validIban("GB82 WEST 1234 5698 7654 32"), true);
  assert.equal(validIban("AZ21NABZ00000000137010001944"), true);
  assert.equal(validIban("AZ22NABZ00000000137010001944"), false);
});

test("profile is cleaned and bad values are reported", () => {
  const { profile, issues } = normalizeProfile({
    fin: "5abc12x", idNumber: "AA123", iban: "AZ00", birthDate: "2001-02-30", gender: "male",
    idIssuedDate: "2020-01-01", idExpires: "2019-01-01", childrenUnder14: "2", hasDisabledChild: true,
  });
  assert.equal(profile.fin, "5ABC12X");
  assert.equal(profile.idNumber, "");
  assert.equal(profile.iban, "");
  assert.equal(profile.birthDate, "");
  assert.equal(profile.childrenUnder14, 2);
  assert.ok(issues.length >= 4);
  assert.equal(normalizeProfile({ fin: "1234" }).profile.fin, "");
  assert.equal(normalizeProfile(null).issues.length, 0);
  assert.equal(parseProfile("not json").citizenship, "Azərbaycan");
});

test("age and card expiry", () => {
  assert.equal(ageOn("2000-06-15", "2026-06-14"), 25);
  assert.equal(ageOn("2000-06-15", "2026-06-15"), 26);
  assert.equal(ageOn("", "2026-06-15"), null);
  const p = { ...parseProfile("{}"), idExpires: "2026-07-01" };
  assert.equal(idExpiresSoon(p, "2026-06-01"), true);
  assert.equal(idExpiresSoon(p, "2026-01-01"), false);
});

import { suggestSections, splitNames } from "../lib/section-suggestions.ts";
test("sections suggested for a department", () => {
  assert.ok(suggestSections("Maliyyə departamenti", []).includes("Mühasibat"));
  assert.ok(!suggestSections("Maliyyə", ["mühasibat"]).includes("Mühasibat"));
  assert.ok(suggestSections("IT", []).includes("Proqram təminatı"));
  assert.ok(suggestSections("HR və kadr", []).includes("İşə qəbul"));
  assert.deepEqual(suggestSections("Qonaqpərvərlik", []), []);
  assert.ok(!suggestSections("Hesabat", []).includes("Proqram təminatı")); // "it" is not inside other words
});
test("names split from a pasted list", () => {
  assert.deepEqual(splitNames("Mühasibat\n büdcə ;Xəzinə, mühasibat,\n\n a"), ["Mühasibat", "büdcə", "Xəzinə"]);
});
