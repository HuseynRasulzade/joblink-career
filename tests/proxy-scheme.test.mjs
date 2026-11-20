import test from "node:test";
import assert from "node:assert/strict";
import { behindProxy } from "../lib/proxy-scheme.ts";

const req = (headers = {}, url = "http://jobmatch.az/api/joblink/auth/login") => new Request(url, { method: "POST", headers, body: "{}" });

test("TRUST_PROXY off: the request stays as it is", () => {
  const r = req({ "x-forwarded-proto": "https" });
  assert.equal(behindProxy(r, undefined), r);
  assert.equal(behindProxy(r, "0"), r);
});

test("TRUST_PROXY on and https from the proxy: the origin becomes https", async () => {
  const r = behindProxy(req({ "x-forwarded-proto": "https", origin: "https://jobmatch.az" }), "1");
  assert.equal(new URL(r.url).origin, "https://jobmatch.az");
  assert.equal(r.method, "POST");
  assert.equal(await r.text(), "{}");
  assert.equal(r.headers.get("origin"), "https://jobmatch.az");
});

test("no header or an http header: unchanged; an https url is untouched", () => {
  const plain = req();
  assert.equal(behindProxy(plain, "1"), plain);
  const http = req({ "x-forwarded-proto": "http" });
  assert.equal(behindProxy(http, "1"), http);
  const already = req({ "x-forwarded-proto": "https" }, "https://jobmatch.az/");
  assert.equal(behindProxy(already, "1"), already);
});
