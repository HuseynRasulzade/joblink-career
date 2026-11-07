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
    assert.equal(body.from, "JobMatch <no-reply@x.az>");
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

import { renderMail } from "../lib/mail-template.ts";

test("every mail carries an HTML layout beside the plain text", async () => {
  const sent = [];
  const settings = { EMAIL_FROM: "no-reply@x.az", SITE_URL: "https://joblink.example", EMAIL: { send: async (m) => sent.push(m) } };
  await sendMail(settings, { to: "a@b.az", subject: "Salam", text: "Birinci sətir.\n\nİkinci abzas: https://joblink.example/x." });
  assert.equal(sent[0].text.includes("Birinci sətir."), true);
  assert.match(sent[0].html, /<!doctype html>/);
  assert.match(sent[0].html, /joblink/);
  assert.match(sent[0].html, /<a href="https:\/\/joblink\.example\/x"/);
});

test("the layout escapes the text, shows the button and keeps a plain-text link", () => {
  const out = renderMail({ subject: "<b>Başlıq</b>", text: "Salam <script>alert(1)</script> & sağ ol", action: { label: "Aç", url: "https://joblink.example/a?b=1&c=2" }, siteUrl: "https://joblink.example" });
  assert.doesNotMatch(out.html, /<script>/);
  assert.match(out.html, /&lt;script&gt;/);
  assert.match(out.html, /&lt;b&gt;Başlıq&lt;\/b&gt;/);
  assert.match(out.html, /Aç<\/a>/);
  assert.match(out.html, /Hesab ayarlarında/);
  assert.equal(out.text.endsWith("Aç: https://joblink.example/a?b=1&c=2"), true);
});

test("an unsafe button address is dropped, never written into the mail", () => {
  const out = renderMail({ subject: "s", text: "t", action: { label: "Aç", url: "javascript:alert(1)" } });
  assert.doesNotMatch(out.html, /javascript:/);
  assert.equal(out.text, "t");
});
