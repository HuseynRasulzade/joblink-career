import { runtime, store, HttpError, jsonBody, str } from "./server";

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

async function issueSession(userId: string) {
  const token = random();
  await (
    await store()
  )
    .prepare("INSERT INTO sessions(id,user_id,expires) VALUES(?,?,?)")
    .bind(await hash(token), userId, now() + 7 * 86400)
    .run();
  return setCookie(sessionCookie, token, 7 * 86400);
}

function normalizeEmail(value: unknown) {
  return str(value, 254).toLocaleLowerCase("en-US");
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
        db.prepare("UPDATE company_members SET status='removed' WHERE user_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM company_profiles WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM company_employees WHERE company_id=?").bind(userId),
      db.prepare("DELETE FROM sessions WHERE user_id=?").bind(userId),
      ]);
      return response({ ok: true }, [await issueSession(userId)]);
    }
    if (account.role === "admin")
      throw new HttpError(403, "Administrator hesabı bu yolla silinə bilməz.");
    await db.batch([
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
      db.prepare("DELETE FROM interviews WHERE candidate_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM digest_subscriptions WHERE user_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM messages WHERE thread_id IN (SELECT id FROM message_threads WHERE company_id=? OR candidate_id=?)").bind(userId, userId),
      db.prepare("DELETE FROM message_threads WHERE company_id=? OR candidate_id=?").bind(userId, userId),
      db.prepare("UPDATE company_members SET status='removed' WHERE user_id=? OR company_id=?").bind(userId, userId),
      db.prepare("DELETE FROM company_profiles WHERE company_id=?").bind(userId),
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
    return response({ ok: true, name, role }, [await issueSession(userId)], 201);
  }

  const account = await db
    .prepare(
      "SELECT p.user_id,p.password_hash,p.password_salt,COALESCE(a.role,'candidate') AS role,COALESCE(a.status,'active') AS status FROM password_accounts p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.email=?",
    )
    .bind(email)
    .first<PasswordAccount>();
  if (!account || !(await passwordsMatch(password, account)))
    throw new HttpError(401, "E-poçt və ya şifrə yanlışdır.");
  if (account.status === "suspended")
    throw new HttpError(403, "Bu hesab administrator tərəfindən dayandırılıb.");
  return response(
    { ok: true, role: account.role || "candidate" },
    [await issueSession(account.user_id)],
  );
}
