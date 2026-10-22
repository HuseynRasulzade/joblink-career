// Prints SQL that creates three demo accounts (candidate, company, admin) with
// fresh random passwords. The passwords are printed once to stderr and only
// their salted PBKDF2 hashes go into the SQL, matching lib/external-auth.ts.
//
//   node scripts/seed-demo-accounts.mjs > /tmp/seed.sql
//   npx wrangler d1 execute joblink-career-db --remote --file /tmp/seed.sql
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";

const accounts = [
  { email: "namized@joblink.test", name: "Demo Namizəd", role: "candidate" },
  { email: "isveren@joblink.test", name: "Demo Şirkət", role: "company" },
  { email: "admin@joblink.test", name: "Demo Admin", role: "admin" },
];

const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const created = new Date().toISOString();

for (const a of accounts) {
  const password = randomBytes(12).toString("base64url");
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, Buffer.from(salt, "base64url"), 100_000, 32, "sha256").toString("base64url");
  const id = randomUUID();
  console.log(`INSERT INTO accounts(id,name,role,created) VALUES(${q(id)},${q(a.name)},${q(a.role)},${q(created)});`);
  console.log(`INSERT INTO password_accounts(email,user_id,password_hash,password_salt) VALUES(${q(a.email)},${q(id)},${q(hash)},${q(salt)});`);
  console.error(`${a.role.padEnd(10)} ${a.email}  ${password}`);
}
