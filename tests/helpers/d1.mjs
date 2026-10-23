// A small D1-shaped wrapper over node:sqlite, so scheduled jobs can be tested against real SQL.
import { DatabaseSync } from "node:sqlite";

export function memoryD1(schema) {
  const db = new DatabaseSync(":memory:");
  db.exec(schema);
  const statement = (sql, values = []) => ({
    bind: (...next) => statement(sql, next),
    all: async () => ({ results: db.prepare(sql).all(...values) }),
    first: async () => db.prepare(sql).get(...values) ?? null,
    run: async () => {
      const r = db.prepare(sql).run(...values);
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return { prepare: (sql) => statement(sql), raw: db };
}
