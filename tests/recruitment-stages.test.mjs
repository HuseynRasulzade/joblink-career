import test from "node:test";
import assert from "node:assert/strict";
import { STAGE_CATALOG, stageInfo } from "../lib/recruitment.ts";

test("catalog stages keep their type and meeting kind", () => {
  assert.equal(stageInfo("Test").type, "test");
  assert.deepEqual([stageInfo("Onlayn görüş").type, stageInfo("Onlayn görüş").kind], ["interview", "online"]);
  assert.deepEqual([stageInfo("Üz-üzə görüş").type, stageInfo("Üz-üzə görüş").kind], ["interview", "onsite"]);
  assert.equal(stageInfo("CV-nin yoxlanılması").type, "review");
  assert.ok(STAGE_CATALOG.length >= 8);
});

test("stages named by the employer are recognised by their words", () => {
  assert.equal(stageInfo("İngilis dili testi").type, "test");
  assert.equal(stageInfo("Excel tapşırığı").type, "test");
  assert.equal(stageInfo("Zoom ilə söhbət").kind, "online");
  assert.equal(stageInfo("Telefon zəngi").kind, "phone");
  assert.equal(stageInfo("Direktorla müsahibə").type, "interview");
  assert.equal(stageInfo("Sənəd yoxlanışı").type, "review");
});
