import test from "node:test";
import assert from "node:assert/strict";
import { greetingFor, mailPlan } from "../lib/mail-copy.ts";
import { renderMail } from "../lib/mail-template.ts";

const site = "https://joblink.example";

test("each notification opens its own page with a fitting button", () => {
  assert.deepEqual(mailPlan("approval", "hr-approvals", site), { eyebrow: "Təsdiq", label: "Təsdiqlərə keç", url: `${site}/#hr-approvals` });
  assert.equal(mailPlan("workplace", "workplace", site).url, `${site}/#workplace`);
  assert.equal(mailPlan("workplace", "workplace", site).label, "İş yerimə keç");
  assert.equal(mailPlan("offer", "applications", site).label, "Təklifə bax");
  assert.equal(mailPlan("test", "applications", site).label, "Testə keç");
  assert.equal(mailPlan("interview", "hr-interviews", site).eyebrow, "Müsahibə");
});

test("an unknown notice or a strange link falls back to the home page and a general button", () => {
  assert.deepEqual(mailPlan("whatever", "", site), { eyebrow: "Bildiriş", label: "Joblink-də aç", url: site });
  assert.equal(mailPlan("whatever", "x/../evil?y=1", site).url, site);
});

test("the greeting uses the first name only", () => {
  assert.equal(greetingFor("Aysel Məmmədova"), "Salam, Aysel");
  assert.equal(greetingFor("  "), "Salam");
  assert.equal(greetingFor(""), "Salam");
});

test("the layout shows the heading above the title and the greeting before the text, in HTML and in plain text", () => {
  const out = renderMail({ subject: "Təsdiq gözləyir", text: "Sorğuya baxın.", greeting: "Salam, Aysel", eyebrow: "Təsdiq", action: { label: "Təsdiqlərə keç", url: `${site}/#hr-approvals` }, siteUrl: site });
  assert.match(out.html, /TƏSDİQ|Təsdiq<\/div>/);
  assert.match(out.html, /Salam, Aysel,<\/p>/);
  assert.ok(out.html.indexOf("Salam, Aysel") > out.html.indexOf("Təsdiq gözləyir"));
  assert.match(out.html, /href="https:\/\/joblink\.example\/#hr-approvals"/);
  assert.equal(out.text, `Salam, Aysel,\n\nSorğuya baxın.\n\nTəsdiqlərə keç: ${site}/#hr-approvals`);
});
