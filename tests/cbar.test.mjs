import test from "node:test";
import assert from "node:assert/strict";
import { cbarUrl, fetchCbarRates, parseCbarXml, perUnitRates } from "../lib/cbar.ts";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ValCurs Date="06.11.2026" Name="AZN məzənnələri">
  <ValType Type="Bank metalları"><Valute Code="XAU"><Nominal>1 t.u.</Nominal><Name>Qızıl</Name><Value>6877.435</Value></Valute></ValType>
  <ValType Type="Xarici valyutalar">
    <Valute Code="USD"><Nominal>1</Nominal><Name>1 ABŞ dolları</Name><Value>1.7</Value></Valute>
    <Valute Code="EUR"><Nominal>1</Nominal><Name>1 Avro</Name><Value>1.9037</Value></Valute>
    <Valute Code="JPY"><Nominal>100</Nominal><Name>100 Yapon yeni</Name><Value>1.0768</Value></Valute>
    <Valute Code="BAD"><Nominal>1</Nominal><Name>x</Name><Value>abc</Value></Valute>
  </ValType>
</ValCurs>`;

test("the bulletin url follows the bank's day.month.year pattern", () => {
  assert.equal(cbarUrl("2026-11-06"), "https://www.cbar.az/currencies/06.11.2026.xml");
});

test("the bulletin is read: foreign currencies only, with nominals and per-unit values", () => {
  const b = parseCbarXml(xml);
  assert.equal(b.date, "2026-11-06");
  assert.equal(b.rates.USD.perUnit, 1.7);
  assert.equal(b.rates.EUR.perUnit, 1.9037);
  assert.equal(b.rates.JPY.nominal, 100);
  assert.equal(b.rates.JPY.perUnit, 0.010768);
  assert.equal(b.rates.XAU, undefined);
  assert.equal(b.rates.BAD, undefined);
  assert.deepEqual(perUnitRates(b, ["USD", "JPY", "GBP"]), { USD: 1.7, JPY: 0.010768 });
});

test("an unreadable or empty bulletin gives nothing", () => {
  assert.equal(parseCbarXml(""), null);
  assert.equal(parseCbarXml("<html>blocked</html>"), null);
  assert.equal(parseCbarXml('<ValCurs Date="06.11.2026"><ValType Type="Xarici valyutalar"></ValType></ValCurs>'), null);
});

test("a day without a bulletin falls back to the nearest earlier day; a far future day uses today", async () => {
  const asked = [];
  const fetcher = async (url) => {
    asked.push(url);
    return url.includes("03.01.2031") || url.includes("02.01.2031") ? { ok: false } : { ok: true, text: async () => xml };
  };
  const b = await fetchCbarRates("2031-01-03", fetcher, "2031-01-05");
  assert.equal(b.rates.USD.perUnit, 1.7);
  assert.equal(asked.length, 3);
  assert.match(asked[0], /03\.01\.2031/);
  assert.match(asked[2], /01\.01\.2031/);
  const far = [];
  await fetchCbarRates("2040-01-01", async (url) => { far.push(url); return { ok: true, text: async () => xml }; }, "2030-06-10");
  assert.match(far[0], /10\.06\.2030/);
});

test("an unreachable bank site or a bad date returns null instead of failing", async () => {
  assert.equal(await fetchCbarRates("2032-01-01", async () => { throw new Error("offline"); }, "2032-01-02"), null);
  assert.equal(await fetchCbarRates("not-a-date", async () => ({ ok: true, text: async () => xml })), null);
});

test("a finished day is fetched once", async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return { ok: true, text: async () => xml }; };
  await fetchCbarRates("2033-03-03", fetcher, "2033-03-10");
  await fetchCbarRates("2033-03-03", fetcher, "2033-03-10");
  assert.equal(calls, 1);
});
