// Counts the database queries of one request and the time they take, so a slow answer can be told apart: a request that makes
// twelve round trips to the database is not the same as one that waits for the AI. The numbers go out in the Server-Timing header
// (visible in the browser's network tab) and a slow or failed request is written to the Worker log.
import { AsyncLocalStorage } from "node:async_hooks";

export type Trace = { queries: number; ms: number; slowest: { sql: string; ms: number } };
const store = new AsyncLocalStorage<Trace>();

export async function runTraced<T>(fn: () => Promise<T>): Promise<{ result: T; trace: Trace }> {
  const trace: Trace = { queries: 0, ms: 0, slowest: { sql: "", ms: 0 } };
  const result = await store.run(trace, fn);
  return { result, trace };
}
const note = (sql: string, ms: number) => {
  const t = store.getStore();
  if (!t) return;
  t.queries += 1;
  t.ms += ms;
  if (ms > t.slowest.ms) t.slowest = { sql: sql.replace(/\s+/g, " ").slice(0, 90), ms };
};
const TIMED = new Set(["first", "all", "run", "raw"]);
const REAL = Symbol("real-statement");
function wrapStatement(statement: D1PreparedStatement, sql: string): D1PreparedStatement {
  return new Proxy(statement, {
    get(target, prop, receiver) {
      if (prop === REAL) return target;
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (prop === "bind") return (...args: unknown[]) => wrapStatement((value as (...a: unknown[]) => D1PreparedStatement).apply(target, args), sql);
      if (typeof prop === "string" && TIMED.has(prop))
        return async (...args: unknown[]) => {
          const started = Date.now();
          try {
            return await (value as (...a: unknown[]) => unknown).apply(target, args);
          } finally {
            note(sql, Date.now() - started);
          }
        };
      return value.bind(target);
    },
  });
}
const wrapped = new WeakMap<object, D1Database>();
export function traceDb(db: D1Database): D1Database {
  const known = wrapped.get(db);
  if (known) return known;
  const proxy = new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (prop === "prepare") return (sql: string) => wrapStatement(target.prepare(sql), sql);
      if (prop === "batch")
        return async (statements: D1PreparedStatement[]) => {
          const started = Date.now();
          try {
            // The wrapped statements are proxies; the database wants the real ones back.
            return await target.batch(statements.map((s) => ((s as unknown as Record<symbol, D1PreparedStatement>)[REAL] as D1PreparedStatement | undefined) || s));
          } finally {
            note(`batch(${statements.length})`, Date.now() - started);
          }
        };
      return value.bind(target);
    },
  });
  wrapped.set(db, proxy);
  return proxy;
}
export const serverTiming = (trace: Trace, totalMs: number) => `db;dur=${trace.ms};desc="${trace.queries} queries", total;dur=${totalMs}`;
