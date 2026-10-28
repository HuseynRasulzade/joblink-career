import { mailConfigured, sendMail } from "./mail.ts";
import { runtime, store, HttpError, jsonBody, str } from "./server";
import { generateSecret, otpauthUri, verifyTotp } from "./totp";

type PasswordAccount = {
  user_id: string;
  password_hash: string;
  password_salt: string;
  role: "candidate" | "company" | "admin";
  status: "active" | "suspended";
};
type SecureSubtleCrypto = SubtleCrypto & {
  timingSafeEqual(left: BufferSource, right: BufferSource): boolean;
};

const sessionCookie = "__Host-joblink_session";
const now = () => Math.floor(Date.now() / 1000);
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function random(size = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function hash(value: string) {
  return Buffer.from(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  ).toString("hex");
}

async function derivePassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: Buffer.from(salt, "base64url"),
      // Workers WebCrypto currently accepts at most 100,000 PBKDF2 rounds.
      // Keep this at the platform limit so registration behaves identically in
      // local development and production.
      iterations: 100_000,
    },
    key,
    256,
  );
  return base64url(new Uint8Array(bits));
}

async function passwordsMatch(password: string, account: PasswordAccount) {
  const candidate = Buffer.from(
    await derivePassword(password, account.password_salt),
    "base64url",
  );
  const expected = Buffer.from(account.password_hash, "base64url");
  if (candidate.length !== expected.length) return false;
  return (crypto.subtle as SecureSubtleCrypto).timingSafeEqual(
    candidate,
    expected,
  );
}

function cookie(request: Request, name: string) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(name + "="))
      ?.slice(name.length + 1) || ""
  );
}

function setCookie(name: string, value: string, seconds: number) {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${seconds}`;
}

function response(data: unknown, cookies: string[] = [], status = 200) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json",
  });
  cookies.forEach((value) => headers.append("Set-Cookie", value));
  return new Response(JSON.stringify(data), { headers, status });
}

export async function sessionIdentity(request: Request) {
  const token = cookie(request, sessionCookie);
  if (!/^[\w-]{43}$/.test(token)) return null;
  const row = await (
    await store()
  )
    .prepare("SELECT user_id FROM sessions WHERE id=? AND expires>?")
    .bind(await hash(token), now())
    .first<{ user_id: string }>();
  return row?.user_id || null;
}

async function limit(request: Request, kind: string, maximum: number) {
  const db = await store();
  const expiry = (Math.floor(now() / 600) + 1) * 600;
  const key = await hash(
    `${request.headers.get("cf-connecting-ip") || "local"}:${kind}:${expiry}`,
  );
  const row = await db
    .prepare(
      "INSERT INTO auth_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(key, expiry)
    .first<{ count: number }>();
  if ((row?.count || 0) > maximum)
    throw new HttpError(
      429,
      "Çox sayda giriş cəhdi. 10 dəqiqə sonra yenidən sınayın.",
    );
  await db.batch([
    db.prepare("DELETE FROM auth_limits WHERE expires<?").bind(now() - 3600),
    db.prepare("DELETE FROM sessions WHERE expires<?").bind(now()),
  ]);
}

async function issueSession(userId: string, request?: Request) {
  const token = random();
  await (
    await store()
  )
    .prepare("INSERT INTO sessions(id,user_id,expires,created,agent) VALUES(?,?,?,?,?)")
    .bind(await hash(token), userId, now() + 7 * 86400, now(), (request?.headers.get("user-agent") || "").slice(0, 160))
    .run();
  return setCookie(sessionCookie, token, 7 * 86400);
}

// E-mail for account security (reset and verification links). Without a mailer nothing is sent;
// DEV_MAIL_LOG=1 prints the message for local checks.
async function sendAuthMail(to: string, subject: string, text: string) {
  const settings = runtime();
  if (mailConfigured(settings)) {
    try {
      await sendMail(settings, { to, subject, text });
    } catch {
      /* the link can be requested again */
    }
  } else if (settings.DEV_MAIL_LOG === "1") console.log(`[mail] to=${to} subject=${subject}\n${text}`);
}

// One-time links are stored hashed and expire; only the e-mailed token opens them.
async function issueToken(userId: string, kind: "reset" | "verify", seconds: number) {
  const db = await store();
  const token = random();
  await db.batch([
    db.prepare("DELETE FROM auth_tokens WHERE user_id=? AND kind=?").bind(userId, kind),
    db.prepare("INSERT INTO auth_tokens(id,user_id,kind,expires) VALUES(?,?,?,?)").bind(await hash(token), userId, kind, now() + seconds),
  ]);
  return token;
}
async function takeToken(token: string, kind: "reset" | "verify") {
  if (!/^[\w-]{43}$/.test(token)) return null;
  const db = await store();
  const row = await db.prepare("DELETE FROM auth_tokens WHERE id=? AND kind=? AND expires>? RETURNING user_id").bind(await hash(token), kind, now()).first<{ user_id: string }>();
  return row?.user_id || null;
}
async function sendVerification(request: Request, userId: string, email: string) {
  const token = await issueToken(userId, "verify", 3 * 86400);
  await sendAuthMail(email, "Joblink: e-poçtunuzu təsdiqləyin", `E-poçt ünvanınızı təsdiqləmək üçün linkə keçin (3 gün qüvvədədir):\n${new URL(request.url).origin}/#verify=${token}\n\nBu sorğunu siz etməmisinizsə, məktuba məhəl qoymayın.`);
}

// A current authenticator code, or one unused backup code (spent when used).
async function secondFactorOk(db: D1Database, userId: string, row: { secret: string; backup_codes: string }, code: string) {
  const given = code.trim().toLowerCase();
  if (!given) return false;
  if (await verifyTotp(row.secret, given)) return true;
  let hashes: string[] = [];
  try { hashes = JSON.parse(row.backup_codes) as string[]; } catch { hashes = []; }
  const digest = await hash(given);
  if (!hashes.includes(digest)) return false;
  await db.prepare("UPDATE totp_secrets SET backup_codes=? WHERE user_id=?").bind(JSON.stringify(hashes.filter((h) => h !== digest)), userId).run();
  return true;
}

const backupCodeCount = 8;
function newBackupCodes() {
  return Array.from({ length: backupCodeCount }, () => random(6).replace(/[-_]/g, "x").slice(0, 8).toLowerCase());
}

function normalizeEmail(value: unknown) {
  return str(value, 254).toLocaleLowerCase("en-US");
}

// Wrong passwords for one account are counted whatever address they come from, so a
// password cannot be guessed by spreading the attempts over many IP addresses.
const ACCOUNT_FAILURES = 8;
async function accountFailureKey(email: string) {
  return hash(`account:${email}:${Math.floor(now() / 900)}`);
}
async function assertAccountNotLocked(email: string) {
  const row = await (await store())
    .prepare("SELECT count FROM auth_limits WHERE id=?")
    .bind(await accountFailureKey(email))
    .first<{ count: number }>();
  if ((row?.count || 0) >= ACCOUNT_FAILURES)
    throw new HttpError(429, "Bu hesab üçün çox sayda yanlış cəhd olub. 15 dəqiqə sonra yenidən sınayın.");
}
async function noteAccountFailure(email: string) {
  const expiry = (Math.floor(now() / 900) + 1) * 900;
  await (await store())
    .prepare("INSERT INTO auth_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1")
    .bind(await accountFailureKey(email), expiry)
    .run();
}

// Cloudflare Turnstile: only when TURNSTILE_SECRET is set.
async function checkRobot(request: Request, body: Record<string, unknown>) {
  const secret = runtime().TURNSTILE_SECRET;
  if (!secret) return;
  const token = typeof body.turnstile === "string" ? body.turnstile.slice(0, 2100) : "";
  if (!token) throw new HttpError(400, "Robot yoxlamasını tamamlayın.");
  const form = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.set("remoteip", ip);
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form })
    .then((r) => r.json() as Promise<{ success?: boolean }>)
    .catch(() => null);
  if (!result?.success) throw new HttpError(400, "Robot yoxlaması alınmadı. Səhifəni yeniləyib yenidən cəhd edin.");
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, "Etibarlı e-poçt ünvanı yazın.");
}

function validatePassword(password: string) {
  if (password.length < 10 || password.length > 128)
    throw new HttpError(400, "Şifrə 10–128 simvol arasında olmalıdır.");
}

export async function authRoute(request: Request, path: string) {
  if (runtime().EXTERNAL_AUTH !== "password")
    throw new HttpError(404, "Giriş üsulu mövcud deyil.");
  if (request.method !== "POST")
    throw new HttpError(405, "POST sorğusu tələb olunur.");
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new HttpError(403, "Giriş sorğusunun mənbəyi uyğun deyil.");

  const db = await store();
  const kind = path.split("/")[1];
  if (kind === "logout") {
    const token = cookie(request, sessionCookie);
    if (token)
      await db
        .prepare("DELETE FROM sessions WHERE id=?")
        .bind(await hash(token))
        .run();
    return response({ ok: true }, [setCookie(sessionCookie, "", 0)]);
  }
  // Forgotten password: always the same answer, so the form cannot be used to find out who has an account.
  if (kind === "config") return response({ turnstileSiteKey: runtime().TURNSTILE_SITE_KEY && runtime().TURNSTILE_SECRET ? runtime().TURNSTILE_SITE_KEY : "" });
  if (kind === "forgot") {
    await limit(request, "forgot", 5);
    const body = await jsonBody(request);
    const email = normalizeEmail(body.email);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const account = await db.prepare("SELECT user_id FROM password_accounts WHERE email=?").bind(email).first<{ user_id: string }>();
      if (account) {
        const token = await issueToken(account.user_id, "reset", 3600);
        await sendAuthMail(email, "Joblink: şifrənin sıfırlanması", `Şifrəni yeniləmək üçün linkə keçin (1 saat qüvvədədir):\n${new URL(request.url).origin}/#reset=${token}\n\nBu sorğunu siz etməmisinizsə, məktuba məhəl qoymayın; şifrəniz dəyişməyib.`);
      }
    }
    return response({ ok: true });
  }
  if (kind === "reset") {
    await limit(request, "reset", 10);
    const body = await jsonBody(request);
    const password = typeof body.password === "string" ? body.password : "";
    validatePassword(password);
    const userId = await takeToken(str(body.token, 80), "reset");
    if (!userId) throw new HttpError(400, "Link etibarsızdır və ya vaxtı bitib. Yeni link istəyin.");
    const salt = random(16);
    // The e-mailed link proves the e-mail address too; every device is signed out.
    await db.batch([
      db.prepare("UPDATE password_accounts SET password_hash=?,password_salt=?,verified=1 WHERE user_id=?").bind(await derivePassword(password, salt), salt, userId),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM auth_tokens WHERE user_id=?").bind(userId),
    ]);
    return response({ ok: true });
  }
  if (kind === "verify") {
    await limit(request, "verify", 20);
    const body = await jsonBody(request);
    const userId = await takeToken(str(body.token, 80), "verify");
    if (!userId) throw new HttpError(400, "Link etibarsızdır və ya vaxtı bitib. Hesab təhlükəsizliyindən yenisini istəyin.");
    await db.prepare("UPDATE password_accounts SET verified=1 WHERE user_id=?").bind(userId).run();
    return response({ ok: true });
  }
  if (["resend-verification", "sessions", "revoke-session", "2fa-status", "2fa-setup", "2fa-enable", "2fa-disable"].includes(kind)) {
    const userId = await sessionIdentity(request);
    if (!userId) throw new HttpError(401, "Davam etmək üçün hesabınıza daxil olun.");
    const body = await jsonBody(request);
    const mine = await hash(cookie(request, sessionCookie));
    if (kind === "resend-verification") {
      await limit(request, "resend", 3);
      const account = await db.prepare("SELECT email,verified FROM password_accounts WHERE user_id=?").bind(userId).first<{ email: string; verified: number }>();
      if (account && !account.verified) await sendVerification(request, userId, account.email);
      return response({ ok: true, verified: !!account?.verified });
    }
    if (kind === "sessions") {
      const rows = await db.prepare("SELECT id,created,expires,agent FROM sessions WHERE user_id=? AND expires>? ORDER BY created DESC").bind(userId, now()).all<{ id: string; created: number; expires: number; agent: string }>();
      return response({ sessions: rows.results.map((r) => ({ id: r.id.slice(0, 16), current: r.id === mine, created: r.created ? new Date(r.created * 1000).toISOString() : "", agent: r.agent })) });
    }
    if (kind === "revoke-session") {
      // "others" signs out every other device; an id signs out one.
      if (body.all === true) await db.prepare("DELETE FROM sessions WHERE user_id=? AND id<>?").bind(userId, mine).run();
      else {
        const prefix = str(body.id, 32).replace(/[^0-9a-f]/g, "");
        if (prefix.length < 16) throw new HttpError(400, "Sessiya tapılmadı.");
        await db.prepare("DELETE FROM sessions WHERE user_id=? AND id<>? AND substr(id,1,16)=?").bind(userId, mine, prefix).run();
      }
      return response({ ok: true });
    }
    const totpRow = await db.prepare("SELECT secret,enabled,backup_codes FROM totp_secrets WHERE user_id=?").bind(userId).first<{ secret: string; enabled: number; backup_codes: string }>();
    if (kind === "2fa-status") {
      const account = await db.prepare("SELECT email,verified FROM password_accounts WHERE user_id=?").bind(userId).first<{ email: string; verified: number }>();
      return response({ enabled: !!totpRow?.enabled, verified: !!account?.verified, email: account?.email || "" });
    }
    if (kind === "2fa-setup") {
      if (totpRow?.enabled) throw new HttpError(409, "İki mərhələli giriş artıq aktivdir.");
      const secret = generateSecret();
      const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(userId).first<{ email: string }>();
      await db.prepare("INSERT INTO totp_secrets(user_id,secret,enabled,created) VALUES(?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET secret=excluded.secret,enabled=0,backup_codes='[]'").bind(userId, secret, new Date().toISOString()).run();
      return response({ secret, uri: otpauthUri(account?.email || "hesab", secret) });
    }
    if (kind === "2fa-enable") {
      await limit(request, "2fa", 10);
      if (!totpRow || totpRow.enabled) throw new HttpError(409, "Əvvəl qurulumu başladın.");
      if (!(await verifyTotp(totpRow.secret, str(body.code, 10)))) throw new HttpError(400, "Kod yanlışdır. Tətbiqdəki cari kodu yazın.");
      const codes = newBackupCodes();
      await db.prepare("UPDATE totp_secrets SET enabled=1,backup_codes=? WHERE user_id=?").bind(JSON.stringify(await Promise.all(codes.map((c) => hash(c)))), userId).run();
      return response({ ok: true, backupCodes: codes });
    }
    // 2fa-disable needs the password and a current code (or an unused backup code).
    await limit(request, "2fa", 10);
    if (!totpRow?.enabled) throw new HttpError(409, "İki mərhələli giriş aktiv deyil.");
    const account = await db.prepare("SELECT p.user_id,p.password_hash,p.password_salt,COALESCE(a.role,'candidate') AS role,COALESCE(a.status,'active') AS status FROM password_accounts p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.user_id=?").bind(userId).first<PasswordAccount>();
    if (!account || !(await passwordsMatch(typeof body.currentPassword === "string" ? body.currentPassword : "", account))) throw new HttpError(403, "Hazırkı şifrə yanlışdır.");
    if (!(await secondFactorOk(db, userId, totpRow, str(body.code, 20)))) throw new HttpError(400, "Kod yanlışdır.");
    await db.prepare("DELETE FROM totp_secrets WHERE user_id=?").bind(userId).run();
    return response({ ok: true });
  }
  if (kind === "password" || kind === "delete") {
    const userId = await sessionIdentity(request);
    if (!userId) throw new HttpError(401, "Davam etmək üçün hesabınıza daxil olun.");
    await limit(request, kind, 5);
    const body = await jsonBody(request);
    const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const account = await db
      .prepare(
        "SELECT p.user_id,p.password_hash,p.password_salt,COALESCE(a.role,'candidate') AS role,COALESCE(a.status,'active') AS status FROM password_accounts p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.user_id=?",
      )
      .bind(userId)
      .first<PasswordAccount>();
    if (!account || !(await passwordsMatch(current, account)))
      // 403 rather than 401 so the client does not treat it as an expired session.
      throw new HttpError(403, "Hazırkı şifrə yanlışdır.");
    if (kind === "password") {
      const next = typeof body.newPassword === "string" ? body.newPassword : "";
      validatePassword(next);
      const salt = random(16);
      // Rotating the password signs out every other device.
      await db.batch([
        db
          .prepare("UPDATE password_accounts SET password_hash=?,password_salt=? WHERE user_id=?")
          .bind(await derivePassword(next, salt), salt, userId),
        db.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
      ]);
      return response({ ok: true }, [await issueSession(userId, request)]);
    }
    if (account.role === "admin")
      throw new HttpError(403, "Administrator hesabı bu yolla silinə bilməz.");
    await db.batch([
      db.prepare("INSERT INTO privacy_requests(id,kind,role,created) VALUES(?,'delete',?,?)").bind(crypto.randomUUID(), account.role, new Date().toISOString()),
      db.prepare("DELETE FROM application_events WHERE application_id IN (SELECT id FROM applications WHERE candidate_id=? OR job_id IN (SELECT id FROM jobs WHERE owner=?))").bind(userId, userId),
      db.prepare("DELETE FROM offers WHERE candidate_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM assessment_assignments WHERE candidate_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM assessment_revisions WHERE assessment_id IN (SELECT id FROM assessments WHERE company_id=?)").bind(userId),
      db.prepare("DELETE FROM assessments WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM job_views WHERE job_id IN (SELECT id FROM jobs WHERE owner=?)").bind(userId),
      db.prepare("DELETE FROM verifications WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM job_alerts WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM profile_versions WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM company_reviews WHERE user_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM passkeys WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM auth_challenges WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM auth_tokens WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM totp_secrets WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM ai_job_ratings WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM employee_events WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM employee_documents WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM company_audit WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM headcount_plan WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM staff_units WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM employee_orders WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM attendance_marks WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM company_calendar WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM message_templates WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM offer_templates WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM question_bank WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM saved_searches WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM interview_templates WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM applications WHERE candidate_id=? OR job_id IN (SELECT id FROM jobs WHERE owner=?)").bind(userId, userId),
      db.prepare("DELETE FROM jobs WHERE owner=?").bind(userId),
      db.prepare("DELETE FROM drafts WHERE owner=?").bind(userId),
      db.prepare("DELETE FROM saved WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM profiles WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM uploads WHERE owner=?").bind(userId),
      db.prepare("DELETE FROM ai_cache WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM ai_messages WHERE conversation_id IN (SELECT id FROM ai_conversations WHERE user_id=?)").bind(userId),
      db.prepare("DELETE FROM ai_conversations WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM support_messages WHERE thread_id IN (SELECT id FROM support_threads WHERE user_id=?)").bind(userId),
      db.prepare("DELETE FROM support_threads WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM notifications WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM relations WHERE actor_id=? OR target_id=?").bind(userId, userId),
      db.prepare("DELETE FROM talent_pool WHERE candidate_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM job_templates WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM interviews WHERE candidate_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM digest_subscriptions WHERE user_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM messages WHERE thread_id IN (SELECT id FROM message_threads WHERE company_id=? OR candidate_id=?)").bind(userId, userId),
      db.prepare("DELETE FROM message_threads WHERE company_id=? OR candidate_id=?").bind(userId, userId),
      db.prepare("UPDATE company_members SET status='removed' WHERE user_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM company_profiles WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM company_images WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM employee_tasks WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM approval_requests WHERE company_id=? OR requested_by=?").bind(userId, userId),
      db.prepare("DELETE FROM approval_delegates WHERE company_id=? OR from_user=? OR to_user=?").bind(userId, userId, userId),
      db.prepare("DELETE FROM company_employees WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM payment_methods WHERE account_id=?").bind(userId),
      db.prepare("DELETE FROM subscriptions WHERE account_id=?").bind(userId),
      db.prepare("DELETE FROM plan_payments WHERE account_id=?").bind(userId),
      db.prepare("DELETE FROM usage_counters WHERE account_id=?").bind(userId),
      db.prepare("DELETE FROM contracts WHERE account_id=?").bind(userId),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM password_accounts WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM accounts WHERE id=?").bind(userId),
    ]);
    return response({ ok: true }, [setCookie(sessionCookie, "", 0)]);
  }
  if (kind !== "register" && kind !== "login")
    throw new HttpError(404, "Giriş əməliyyatı tapılmadı.");

  await limit(request, kind, kind === "login" ? 10 : 5);
  const body = await jsonBody(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  validateEmail(email);
  validatePassword(password);
  await checkRobot(request, body);
  if (kind === "login") await assertAccountNotLocked(email);

  if (kind === "register") {
    const name = str(body.name, 100);
    const role = body.role === "company" ? "company" : "candidate";
    if (name.length < 2) throw new HttpError(400, "Adınızı daxil edin.");
    const existing = await db
      .prepare("SELECT 1 FROM password_accounts WHERE email=?")
      .bind(email)
      .first();
    if (existing)
      throw new HttpError(409, "Bu e-poçtla hesab artıq mövcuddur.");
    const userId = crypto.randomUUID();
    const salt = random(16);
    const passwordHash = await derivePassword(password, salt);
    try {
      await db.batch([
        db
          .prepare("INSERT INTO accounts(id,name,role,created) VALUES(?,?,?,?)")
          .bind(userId, name, role, new Date().toISOString()),
        db
          .prepare(
            "INSERT INTO password_accounts(email,user_id,password_hash,password_salt) VALUES(?,?,?,?)",
          )
          .bind(email, userId, passwordHash, salt),
      ]);
    } catch {
      throw new HttpError(409, "Bu e-poçtla hesab artıq mövcuddur.");
    }
    await sendVerification(request, userId, email);
    return response({ ok: true, name, role }, [await issueSession(userId, request)], 201);
  }

  const account = await db
    .prepare(
      "SELECT p.user_id,p.password_hash,p.password_salt,COALESCE(a.role,'candidate') AS role,COALESCE(a.status,'active') AS status FROM password_accounts p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.email=?",
    )
    .bind(email)
    .first<PasswordAccount>();
  if (!account || !(await passwordsMatch(password, account))) {
    await noteAccountFailure(email);
    throw new HttpError(401, "E-poçt və ya şifrə yanlışdır.");
  }
  if (account.status === "suspended")
    throw new HttpError(403, "Bu hesab administrator tərəfindən dayandırılıb.");
  const second = await db.prepare("SELECT secret,backup_codes FROM totp_secrets WHERE user_id=? AND enabled=1").bind(account.user_id).first<{ secret: string; backup_codes: string }>();
  if (second) {
    const code = str(body.code, 20);
    if (!code) return response({ error: "Doğrulama kodunu yazın (autentifikator tətbiqindən və ya ehtiyat kod).", twoFactor: true }, [], 401);
    if (!(await secondFactorOk(db, account.user_id, second, code))) {
      await noteAccountFailure(email);
      return response({ error: "Doğrulama kodu yanlışdır.", twoFactor: true }, [], 401);
    }
  }
  return response(
    { ok: true, role: account.role || "candidate" },
    [await issueSession(account.user_id, request)],
  );
}
