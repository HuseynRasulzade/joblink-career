import test from "node:test";
import assert from "node:assert/strict";
import { generatePublicCode, formatPublicCode, normalizePublicCode } from "../lib/public-code.ts";

test("a code is JM- and ten hex characters, and codes differ", () => {
  const seen = new Set(Array.from({ length: 500 }, generatePublicCode));
  assert.equal(seen.size, 500);
  for (const c of seen) assert.match(c, /^JM-[0-9A-F]{10}$/);
});

test("the shown form can be typed back in any way", () => {
  const code = "JM-9F3A21BC7D";
  assert.equal(formatPublicCode(code), "JM-9F3A2-1BC7D");
  for (const typed of ["JM-9F3A2-1BC7D", "jm-9f3a2-1bc7d", "9f3a21bc7d", " JM 9F3A2 1BC7D "]) assert.equal(normalizePublicCode(typed), code, typed);
  assert.equal(normalizePublicCode("JM-123"), "");
});
