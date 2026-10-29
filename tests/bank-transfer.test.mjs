import test from "node:test";
import assert from "node:assert/strict";
import { buildTransfers, batchTotal, transferFileRows, transferPurpose } from "../lib/bank-transfer.ts";

const base = { fin: "AB12CDE", cardNumber: "", payMethod: "" };
test("transfers go to the IBAN, the card or are skipped", () => {
  const { items, skipped } = buildTransfers([
    { ...base, employeeId: "1", name: "A", iban: "AZ21NABZ00000000137010001944", amount: 865.5 },
    { ...base, employeeId: "2", name: "B", iban: "", cardNumber: "4169738812345670", payMethod: "card", amount: 100 },
    { ...base, employeeId: "3", name: "C", iban: "AZ21NABZ00000000137010001944", payMethod: "cash", amount: 50 },
    { ...base, employeeId: "4", name: "D", iban: "", amount: 70 },
    { ...base, employeeId: "5", name: "E", iban: "AZ21NABZ00000000137010001944", amount: 0 },
  ]);
  assert.deepEqual(items.map((i) => [i.employeeId, i.method, i.amountCents]), [["1", "bank", 86550], ["2", "card", 10000]]);
  assert.deepEqual(skipped.map((s) => s.name), ["C", "D"]);
  assert.equal(batchTotal(items), 96550);
});
test("file rows carry the sender and purpose", () => {
  const { items } = buildTransfers([{ ...base, employeeId: "1", name: "A", iban: "AZ21NABZ00000000137010001944", amount: 10 }]);
  const rows = transferFileRows(items, { bankName: "X", iban: "AZ00SENDER", holder: "", voen: "", currency: "AZN" }, transferPurpose("2026-03", "advance"));
  assert.equal(rows[0][5], 10);
  assert.equal(rows[0][8], "AZ00SENDER");
  assert.match(String(rows[0][7]), /avans/);
});

import { matchStatement, parseBankStatement } from "../lib/bank-transfer.ts";
test("a bank statement is matched to the lines of an order", () => {
  const { items } = buildTransfers([
    { employeeId: "1", name: "Aysel", fin: "", iban: "AZ21NABZ00000000137010001944", cardNumber: "", payMethod: "", amount: 865.5 },
    { employeeId: "2", name: "Orxan", fin: "", iban: "AZ96AIIB33800000000000000001", cardNumber: "", payMethod: "", amount: 100 },
  ]);
  const statement = parseBankStatement([
    ["Tarix", "Alıcı", "IBAN", "Məbləğ", "Təyinat"],
    ["15.03.2026", "Aysel M.", "AZ21 NABZ 0000 0000 1370 1000 1944", "865,50", "maaş"],
    ["16.03.2026", "Başqası", "AZ00XXXX", "12.00", ""],
  ]);
  assert.equal(statement.rows.length, 2);
  const used = new Set();
  const m = matchStatement(items, statement.rows, used);
  assert.equal(m.found, 1);
  assert.equal(m.lastDate, "2026-03-15");
  assert.match(m.missing[0], /Orxan/);
});
