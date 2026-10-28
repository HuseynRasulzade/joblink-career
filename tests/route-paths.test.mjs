import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Two handlers with one method and path would silently shadow each other: the first one wins.
test("no API route is defined twice", () => {
  const source = readFileSync(new URL("../app/api/joblink/[...path]/route.ts", import.meta.url), "utf8");
  const seen = new Map();
  const duplicates = [];
  for (const match of source.matchAll(/request\.method === "(GET|POST|PUT|DELETE)" && path === "([^"]+)"/g)) {
    const key = `${match[1]} ${match[2]}`;
    if (seen.has(key)) duplicates.push(key);
    seen.set(key, true);
  }
  assert.deepEqual(duplicates, []);
  assert.ok(seen.size > 200);
});
