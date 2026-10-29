import test from "node:test";
import assert from "node:assert/strict";
import { generateLinkCode, formatLinkCode, normalizeLinkCode, validLinkCode, hashLinkCode, linkExpiry, linkExpired } from "../lib/employee-link.ts";

test("a code is 10 clear characters, shown in two blocks and typed in any way", () => {
  const code = generateLinkCode();
  assert.equal(code.length, 10);
  assert.ok(validLinkCode(code));
  assert.ok(!/[01OIL]/.test(code));
  const shown = formatLinkCode(code);
  assert.match(shown, /^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  assert.equal(normalizeLinkCode(shown.toLowerCase()), code);
  assert.equal(normalizeLinkCode(` ${shown.slice(0, 5)} ${shown.slice(6)} `), code);
  assert.equal(validLinkCode("SHORT"), false);
  assert.notEqual(generateLinkCode(), generateLinkCode());
});

test("only the hash is kept, and it is stable", async () => {
  const a = await hashLinkCode("ABCDEFGHJK");
  assert.equal(a.length, 64);
  assert.equal(a, await hashLinkCode("ABCDEFGHJK"));
  assert.notEqual(a, await hashLinkCode("ABCDEFGHJM"));
  assert.ok(!a.includes("ABCDEFGHJK"));
});

test("a code runs out after a week", () => {
  const now = new Date("2026-03-01T10:00:00Z");
  const expires = linkExpiry(now);
  assert.equal(expires.slice(0, 10), "2026-03-08");
  assert.equal(linkExpired(expires, now), false);
  assert.equal(linkExpired(expires, new Date("2026-03-09T00:00:00Z")), true);
  assert.equal(linkExpired("", now), true);
});

import { linkCodeSheets } from "../lib/employee-link.ts";
import { createXlsxBook } from "../lib/xlsx.ts";
test("the file of codes has a sheet of rows and a guide", () => {
  const items = [
    { name: "Aysel Məmmədova", position: "Mühasib", department: "Maliyyə", email: "a@example.az", code: "ABCDE-FGHJK", expires: "2026-11-05T10:00:00.000Z" },
    { name: "Orxan Əliyev", position: "", department: "", email: "", code: "KMNPQ-RSTUV", expires: "2026-11-05T10:00:00.000Z" },
  ];
  const [codes, guide] = linkCodeSheets(items, "Test MMC");
  assert.equal(codes.rows.length, 2);
  assert.equal(codes.rows[0][4], "ABCDE-FGHJK");
  assert.equal(codes.rows[0][5], "2026-11-05");
  assert.equal(codes.headers.length, codes.rows[0].length);
  assert.ok(guide.rows.some((r) => /İş yerim/.test(String(r[1]))));
  assert.ok(createXlsxBook([codes, guide]).length > 500);
});
