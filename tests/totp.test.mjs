import test from "node:test";
import assert from "node:assert/strict";
import { base32Encode, base32Decode, hotp, totp, verifyTotp, otpauthUri, generateSecret } from "../lib/totp.ts";

const rfcSecret = new TextEncoder().encode("12345678901234567890");

test("RFC 4226 / 6238 vectors", async () => {
  assert.equal(await hotp(rfcSecret, 0), "755224");
  assert.equal(await hotp(rfcSecret, 1), "287082");
  // T = 59 s is counter 1: the 8-digit code is 94287082.
  assert.equal(await hotp(rfcSecret, 1, 8), "94287082");
});

test("base32 round trip", () => {
  const secret = base32Encode(rfcSecret);
  assert.equal(secret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.deepEqual([...base32Decode(secret)], [...rfcSecret]);
  assert.match(generateSecret(), /^[A-Z2-7]{32}$/);
});

test("verifyTotp accepts the current and neighbouring step only", async () => {
  const secret = base32Encode(rfcSecret);
  const now = 1_000_000_000_000;
  const code = await totp(secret, now);
  assert.equal(await verifyTotp(secret, code, now), true);
  assert.equal(await verifyTotp(secret, code, now + 30000), true);
  assert.equal(await verifyTotp(secret, code, now + 90000), false);
  assert.equal(await verifyTotp(secret, "12345", now), false);
  assert.equal(await verifyTotp(secret, ` ${code.slice(0, 3)} ${code.slice(3)} `, now), true);
});

test("otpauth uri carries the secret and issuer", () => {
  const uri = otpauthUri("a@b.az", "ABC234");
  assert.match(uri, /^otpauth:\/\/totp\/Joblink%3Aa%40b\.az\?secret=ABC234&issuer=Joblink/);
});
