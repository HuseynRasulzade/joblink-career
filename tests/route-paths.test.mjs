import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// Two handlers with one method and path would silently shadow each other: the first one wins.
test("no API route is defined twice", () => {
  // The handlers live in lib/api/handlers/*.ts (the set-up and the helpers of one request stay in route.ts).
  const handlerDir = new URL("../lib/api/handlers/", import.meta.url);
  const source = [
    readFileSync(new URL("../app/api/joblink/[...path]/route.ts", import.meta.url), "utf8"),
    ...readdirSync(handlerDir).filter((f) => f.endsWith(".ts")).map((f) => readFileSync(new URL(f, handlerDir), "utf8")),
  ].join("\n");
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

// The calls in route.ts and the files in lib/api/handlers must match: a handler file nobody calls would be dead code, and a call
// without its file would not build.
test("every handler file is called by route.ts exactly once", () => {
  const route = readFileSync(new URL("../app/api/joblink/[...path]/route.ts", import.meta.url), "utf8");
  const files = readdirSync(new URL("../lib/api/handlers/", import.meta.url)).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length > 50);
  for (const file of files) {
    const name = "handle_" + file.replace(/\.ts$/, "").replace(/-/g, "_");
    const calls = route.split(`await ${name}(`).length - 1;
    assert.equal(calls, 1, `${file} is called ${calls} times`);
  }
});
