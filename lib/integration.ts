// Exchange with the outside programs (1C, SAP, any ERP or accounting system): they read the orders of the platform and
// report back what was paid, with a key of their own; the platform can also tell a web address about every change.
// Nothing here talks to the network: the keys, the order number, the signature and the address check are plain functions.

const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// jl_ + 40 characters; shown once, only its hash is kept.
export function generateApiKey(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = random(40);
  let out = "jl_";
  for (const b of bytes) out += BASE62[b % BASE62.length];
  return out;
}
export const looksLikeApiKey = (value: string) => /^jl_[A-Za-z0-9]{40}$/.test(value);
export const keyPrefix = (key: string) => key.slice(0, 7);

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function hashApiKey(key: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)));
}
export async function signBody(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

// The number the outside program sees for an order: JL-2026-000123.
export const orderNumber = (year: string, sequence: number) => `JL-${year}-${String(Math.max(1, Math.floor(sequence))).padStart(6, "0")}`;
export const parseOrderNumber = (value: string) => {
  const m = /^JL-(\d{4})-(\d{6})$/.exec(String(value || "").trim().toUpperCase());
  return m ? { year: m[1], sequence: Number(m[2]) } : null;
};

// Only https addresses on the public internet; never localhost, a private range or a bare IP.
export function safeWebhookUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "";
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[")) return "";
  return url.toString();
}

export type OrderView = {
  orderNo: string; id: string; status: string; category: string; categoryLabel: string; title: string; department: string; amount: number; currency: "AZN";
  date: string; payee: string; note: string; orderedAt: string; paidOn: string; payMethod: string; payRef: string; externalId: string;
};
export type OrderRow = {
  id: string; order_no: string; status: string; category: string; title: string; department: string; amount: number; expense_date: string; payee: string; note: string;
  ordered_at: string; paid_on: string; pay_method: string; pay_ref: string; external_id: string;
};
export function orderView(row: OrderRow, categoryLabel: (id: string) => string): OrderView {
  return {
    orderNo: row.order_no, id: row.id, status: row.status, category: row.category, categoryLabel: categoryLabel(row.category), title: row.title, department: row.department,
    amount: row.amount, currency: "AZN", date: row.expense_date, payee: row.payee, note: row.note, orderedAt: row.ordered_at, paidOn: row.paid_on,
    payMethod: row.pay_method, payRef: row.pay_ref, externalId: row.external_id,
  };
}

// What the outside program may report for an order: the day it was paid, and (when it sends one) the amount, which must agree.
export function paidReportProblem(order: { amount: number; status: string }, report: { paidOn?: unknown; amount?: unknown }): string {
  if (order.status === "paid") return "Bu sifariş artıq ödənilmiş kimi qeyd olunub.";
  if (order.status !== "ordered" && order.status !== "approved") return "Bu sifariş ödənilə bilən vəziyyətdə deyil.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(report.paidOn ?? ""))) return "paidOn tarixi YYYY-MM-DD formatında olmalıdır.";
  if (report.amount !== undefined && report.amount !== null && report.amount !== "") {
    const amount = Number(report.amount);
    if (!Number.isFinite(amount) || Math.abs(amount - order.amount) > 0.005) return `Ödənilən məbləğ (${report.amount}) sifarişin məbləği (${order.amount}) ilə uyğun deyil.`;
  }
  return "";
}
