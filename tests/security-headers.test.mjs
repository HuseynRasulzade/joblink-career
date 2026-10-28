import test from "node:test";
import assert from "node:assert/strict";
import { withSecurityHeaders, SECURITY_HEADERS } from "../lib/security-headers.ts";

test("every answer carries the security headers and keeps its own", async () => {
  const out = withSecurityHeaders(new Response("hello", { status: 201, headers: { "X-Frame-Options": "DENY", "Content-Type": "text/plain" } }));
  assert.equal(out.status, 201);
  assert.equal(await out.text(), "hello");
  assert.equal(out.headers.get("X-Frame-Options"), "DENY");
  assert.equal(out.headers.get("Strict-Transport-Security"), SECURITY_HEADERS["Strict-Transport-Security"]);
  assert.equal(out.headers.get("X-Content-Type-Options"), "nosniff");
});

test("redirects and empty answers still get the headers", () => {
  const redirect = withSecurityHeaders(Response.redirect("https://x.test/", 302));
  assert.equal(redirect.status, 302);
  assert.ok(redirect.headers.get("Content-Security-Policy")?.includes("frame-ancestors"));
  assert.equal(withSecurityHeaders(new Response(null, { status: 204 })).status, 204);
});
