// One-command local run: node local/run.mjs
// Installs dependencies, creates a local database with demo accounts and starts the site.
import { spawnSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const PORT = process.env.PORT || "3000";
const PASSWORD = "Demo-12345-local";
// Run the tools through node directly: no npx and no .cmd shims, so it also works from a bundled Windows copy.
const binPath = (pkg) => {
  const manifest = JSON.parse(readFileSync(join("node_modules", pkg, "package.json"), "utf8"));
  const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin[pkg] || Object.values(manifest.bin)[0];
  return join(root, "node_modules", pkg, bin);
};
const tool = (pkg, args) => `"${process.execPath}" "${binPath(pkg)}" ${args}`;
const run = (command, env = {}) => spawnSync(command, { shell: true, stdio: "inherit", env: { ...process.env, ...env } }).status === 0;

// Already running (for example started by an earlier click): just open the browser.
try {
  const res = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(2000) });
  if (res.ok) {
    const url = `http://localhost:${PORT}`;
    console.log(`Sayt artıq işləyir: ${url}`);
    if (!process.env.JOBLINK_NO_BROWSER)
      spawnSync(process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`, { shell: true, stdio: "ignore" });
    process.exit(0);
  }
} catch {
  // Not running yet: continue with the normal start.
}

if (Number(process.versions.node.split(".")[0]) < 20) {
  console.error(`Node.js 20 və ya yuxarı lazımdır (sizdə ${process.versions.node}). https://nodejs.org saytından qurun.`);
  process.exit(1);
}

if (!existsSync("node_modules")) {
  console.log("\n[1/4] Asılılıqlar qurulur (ilk dəfə bir neçə dəqiqə çəkə bilər)...");
  if (!run("npm install")) process.exit(1);
} else console.log("\n[1/4] Asılılıqlar hazırdır.");

console.log("[2/4] Lokal konfiqurasiya yazılır...");
const config = JSON.parse(readFileSync("wrangler.external.json", "utf8"));
delete config.ai; // The Cloudflare AI binding exists only online.
writeFileSync("wrangler.local.json", JSON.stringify(config, null, 2));
// Optional: put OPENAI_API_KEY=... or DEEPSEEK_API_KEY=... into .dev.vars to turn the AI features on.
if (!existsSync(".dev.vars")) writeFileSync(".dev.vars", "# OPENAI_API_KEY=\n# DEEPSEEK_API_KEY=\n");
mkdirSync(".wrangler", { recursive: true });

console.log("[3/4] Lokal baza və demo hesablar hazırlanır...");
const env = { JOBLINK_LOCAL: "1", WRANGLER_LOG_PATH: ".wrangler/wrangler.log" };
if (!run(tool("wrangler", "d1 migrations apply joblink-career-db --local --config wrangler.local.json"), env)) process.exit(1);
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const demo = [
  { id: "00000000-0000-4000-8000-0000000000a1", email: "namized@joblink.test", name: "Demo Namizəd", role: "candidate" },
  { id: "00000000-0000-4000-8000-0000000000a2", email: "isveren@joblink.test", name: "Demo Şirkət", role: "company" },
  { id: "00000000-0000-4000-8000-0000000000a3", email: "admin@joblink.test", name: "Demo Admin", role: "admin" },
];
const sql = ["DELETE FROM auth_limits;"];
for (const a of demo) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(PASSWORD, Buffer.from(salt, "base64url"), 100_000, 32, "sha256").toString("base64url");
  sql.push(`INSERT OR IGNORE INTO accounts(id,name,role,created) VALUES(${q(a.id)},${q(a.name)},${q(a.role)},${q(new Date().toISOString())});`);
  sql.push(`INSERT OR IGNORE INTO password_accounts(email,user_id,password_hash,password_salt) VALUES(${q(a.email)},${q(a.id)},${q(hash)},${q(salt)});`);
}
writeFileSync(".wrangler/seed-local.sql", sql.join("\n"));
if (!run(tool("wrangler", "d1 execute joblink-career-db --local --config wrangler.local.json --file .wrangler/seed-local.sql"), env)) process.exit(1);

console.log(`
[4/4] Sayt başlayır: http://localhost:${PORT}

  Demo hesablar (parol hamısı üçün: ${PASSWORD})
    İş axtaran : namized@joblink.test
    İşəgötürən : isveren@joblink.test
    Admin      : admin@joblink.test

  Dayandırmaq üçün: Ctrl+C
`);
// Open the browser by itself once the site answers (the first start can take a minute).
const openUrl = `http://localhost:${PORT}`;
const opener = process.platform === "win32" ? `start "" "${openUrl}"` : process.platform === "darwin" ? `open "${openUrl}"` : `xdg-open "${openUrl}"`;
(async () => {
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log(`\n>>> Sayt hazırdır: ${openUrl}\n`);
        if (!process.env.JOBLINK_NO_BROWSER) spawnSync(opener, { shell: true, stdio: "ignore" });
        return;
      }
    } catch {
      // Not ready yet.
    }
  }
  console.log("Sayt 6 dəqiqə ərzində hazır olmadı. Yuxarıdakı xəta sətirlərinə baxın.");
})();
const server = spawn(tool("vinext", `dev --port ${PORT}`), { shell: true, stdio: "inherit", env: { ...process.env, ...env, JOBLINK_EXTERNAL: "1" } });
server.on("exit", (code) => process.exit(code ?? 0));
