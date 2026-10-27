// One mail sender: Resend over HTTP, or the Cloudflare binding.
import assert from "node:assert/strict";
import test from "node:test";
import { mailConfigured, mailerOf, sendMail } from "../lib/mail.ts";

test("mail is configured only with a sender and a provider", () => {
  assert.equal(mailConfigured({}), false);
  assert.equal(mailConfigured({ EMAIL_FROM: "no-reply@x.az" }), false);
  assert.equal(mailConfigured({ RESEND_API_KEY: "k" }), false);
  assert.equal(mailConfigured({ EMAIL_FROM: "no-reply@x.az", RESEND_API_KEY: "k" }), true);
  assert.equal(mailConfigured({ EMAIL_FROM: "no-reply@x.az", EMAIL: { send: async () => {} } }), true);
});

test("Resend gets the message over HTTP and a refusal is an error", async () => {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: calls.length === 1, status: calls.length === 1 ? 200 : 403 };
  };
  try {
    const settings = { EMAIL_FROM: "no-reply@x.az", RESEND_API_KEY: "key" };
    await sendMail(settings, { to: "a@b.az", subject: "Salam", text: "Mətn" });
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.to, ["a@b.az"]);
    assert.equal(body.from, "Joblink <no-reply@x.az>");
    assert.equal(calls[0].init.headers.Authorization, "Bearer key");
    await assert.rejects(sendMail(settings, { to: "a@b.az", subject: "s", text: "t" }), /403/);
  } finally {
    globalThis.fetch = real;
  }
});

test("the binding is used without a Resend key, and the adapter keeps the jobs working", async () => {
  const sent = [];
  const settings = { EMAIL_FROM: "no-reply@x.az", EMAIL: { send: async (m) => sent.push(m) } };
  await sendMail(settings, { to: "a@b.az", subject: "s", text: "t" });
  assert.equal(sent[0].from.email, "no-reply@x.az");
  assert.equal(mailerOf({}), null);
  const mailer = mailerOf({ EMAIL_FROM: "no-reply@x.az", RESEND_API_KEY: "k" });
  assert.equal(typeof mailer.send, "function");
});

test("AI answers follow the site language, Russian included", async () => {
  const { aiLanguage, aiLanguageName } = await import("../lib/ai-language.ts");
  assert.equal(aiLanguage("ru"), "ru");
  assert.equal(aiLanguage("en"), "en");
  assert.equal(aiLanguage("az"), "az");
  assert.equal(aiLanguage(undefined), "az");
  assert.equal(aiLanguage("de"), "az");
  assert.ok(aiLanguageName("ru").includes("Russian"));
  assert.ok(aiLanguageName("az").includes("Azerbaijani"));
  const { FIT_REVIEW_PROMPT } = await import("../lib/fit-review.ts");
  assert.ok(FIT_REVIEW_PROMPT("ru").includes("Russian"));
});
