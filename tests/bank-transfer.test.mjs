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
