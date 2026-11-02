import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProfile } from "../lib/employee-profile.ts";
import { encryptionOn, revealProfile, sealProfile } from "../lib/secure-profile.ts";

const profile = normalizeProfile({ fin: "5ABC12X", ssn: "123", iban: "AZ21NABZ00000000137010001944", cardNumber: "4169738812345670", address: "Bakı", birthDate: "1990-04-12" }).profile;
const KEY = "a-long-enough-secret-key-1234567890";

test("without a key nothing changes", async () => {
  const json = await sealProfile(profile, undefined);
  assert.equal(JSON.parse(json).fin, "5ABC12X");
  assert.equal(JSON.parse(json).__enc, undefined);
  assert.equal(encryptionOn("short"), false);
});
test("with a key the sensitive fields leave the open JSON and come back through reveal", async () => {
  const json = await sealProfile(profile, KEY);
  const open = JSON.parse(json);
  assert.equal(open.fin, "");
  assert.equal(open.iban, "");
  assert.equal(open.cardNumber, "");
  assert.equal(open.address, "Bakı");
  assert.match(open.__enc, /^v1\./);
  assert.ok(!json.includes("5ABC12X") && !json.includes("4169738812345670"));
  const back = await revealProfile(json, KEY);
  assert.equal(back.locked, false);
  assert.equal(back.profile.fin, "5ABC12X");
  assert.equal(back.profile.cardNumber, "4169738812345670");
  assert.equal(back.profile.birthDate, "1990-04-12");
});
test("a wrong or missing key leaves the profile locked and the sensitive fields empty", async () => {
  const json = await sealProfile(profile, KEY);
  const wrong = await revealProfile(json, "another-long-enough-secret-9876543210");
  assert.equal(wrong.locked, true);
  assert.equal(wrong.profile.fin, "");
  assert.equal((await revealProfile(json, undefined)).locked, true);
  assert.equal((await revealProfile(JSON.stringify(profile), undefined)).profile.fin, "5ABC12X");
});
