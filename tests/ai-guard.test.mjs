// AI budget and provider health.
import assert from "node:assert/strict";
import test from "node:test";
import { budgetState, classifyAiFailure, friendlyAiMessage, monthSpendUsd, readAiBudget, readAiHealth, writeAiBudget, writeAiHealth } from "../lib/ai-guard.ts";
import { memoryD1 } from "./helpers/d1.mjs";

test("the budget level follows the spent share", () => {
  assert.equal(budgetState(0, 50).level, "off");
  assert.equal(budgetState(100, 10).level, "ok");
  assert.equal(budgetState(100, 80).level, "warn");
  assert.equal(budgetState(100, 100).level, "over");
  assert.equal(budgetState(100, 12.345).spent, 12.35);
  assert.equal(budgetState(50, 25).percent, 50);
});

test("a provider refusal is told apart: empty balance, key, rate limit", () => {
  assert.equal(classifyAiFailure(429, "credit_balance_exhausted"), "credit");
  assert.equal(classifyAiFailure(429, "insufficient_quota"), "credit");
  assert.equal(classifyAiFailure(402, ""), "credit");
  assert.equal(classifyAiFailure(401, "invalid_api_key"), "key");
  assert.equal(classifyAiFailure(429, "rate_limit_exceeded"), "rate");
  assert.equal(classifyAiFailure(500, ""), "other");
});

test("people never see the provider's code", () => {
  for (const kind of ["credit", "key", "rate", "other"]) assert.ok(!/credit_balance|429|quota/i.test(friendlyAiMessage(kind)));
  assert.ok(friendlyAiMessage("credit").includes("Qaydalarla"));
});

const schema = [
  "CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL)",
  "CREATE TABLE ai_usage (day TEXT, feature TEXT, provider TEXT, user_id TEXT, calls INT, chars_in INT, chars_out INT, errors INT)",
];
test("budget and health are stored, and spend counts only this month", async () => {
  const db = memoryD1(schema.join(";"));
  assert.equal(await readAiBudget(db), 0);
  await writeAiBudget(db, 25.5);
  assert.equal(await readAiBudget(db), 25.5);
  assert.deepEqual((await readAiHealth(db)).state, "ok");
  await writeAiHealth(db, { state: "credit", code: "credit_balance_exhausted", at: "2026-10-27T10:00:00Z" });
  assert.equal((await readAiHealth(db)).code, "credit_balance_exhausted");
  const now = new Date("2026-10-27T12:00:00Z");
  await db.prepare("INSERT INTO ai_usage VALUES('2026-10-05','x','openai','u',1,400000,40000,0)").run();
  await db.prepare("INSERT INTO ai_usage VALUES('2026-09-28','x','openai','u',1,4000000,400000,0)").run();
  const spent = await monthSpendUsd(db, now);
  assert.ok(spent > 0 && spent < 2, `spent ${spent}`);
});
