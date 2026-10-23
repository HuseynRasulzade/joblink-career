import test from "node:test";
import assert from "node:assert/strict";
import { findDuplicates, normalizePhone } from "../lib/duplicates.ts";

test("phone numbers in different spellings match", () => {
  assert.equal(normalizePhone("+994 50 123 45 67"), "501234567");
  assert.equal(normalizePhone("050 123 45 67"), "501234567");
  assert.equal(normalizePhone("501234567"), "501234567");
  assert.equal(normalizePhone("12"), "");
});

test("same person on several vacancies and shared contacts are flagged", () => {
  const a = (id, candidateId, jobId, name, email, phone) => ({ id, candidateId, jobId, name, email, phone });
  const out = findDuplicates([
    a("1", "u1", "j1", "Əli", "ali@x.az", "050 111 22 33"),
    a("2", "u1", "j2", "Əli", "ali@x.az", "050 111 22 33"),
    a("3", "u2", "j1", "Əli (ikinci)", "ALI@x.az ", ""),
    a("4", "u3", "j1", "Vəli", "vali@x.az", "+994501112233"),
    a("5", "u4", "j3", "Tək", "tek@x.az", ""),
  ]);
  assert.equal(out["1"].otherVacancies, 1);
  assert.deepEqual(out["1"].sameContactAs.sort(), ["Vəli", "Əli (ikinci)"]);
  assert.equal(out["2"].otherVacancies, 1);
  assert.deepEqual(out["3"].sameContactAs, ["Əli"]);
  assert.equal(out["5"], undefined);
});
