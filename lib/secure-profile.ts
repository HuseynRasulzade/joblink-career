// Field encryption of the most sensitive personal data (FİN, SSN, VÖEN, card and account numbers, ID number).
// With a key set (the DATA_KEY secret) they are sealed with AES-GCM into one string inside the profile JSON and are
// read back only through revealProfile(); without a key the profile is stored as it always was.
import { normalizeProfile, parseProfile, type EmployeeProfile } from "./employee-profile.ts";

export const SENSITIVE_FIELDS = ["fin", "ssn", "voen", "idNumber", "iban", "accountNumber", "cardNumber"] as const;
type Sensitive = (typeof SENSITIVE_FIELDS)[number];

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function importKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`joblink-profile:${secret}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export const encryptionOn = (secret: string | undefined) => !!secret && secret.length >= 16;

// The JSON to store: the sensitive fields leave the open part and go, sealed, into `__enc`.
export async function sealProfile(profile: EmployeeProfile, secret: string | undefined): Promise<string> {
  if (!encryptionOn(secret)) return JSON.stringify(profile);
  const open: Record<string, unknown> = { ...profile };
  const secret_: Partial<Record<Sensitive, string>> = {};
  for (const field of SENSITIVE_FIELDS) {
    if (profile[field]) secret_[field] = profile[field];
    open[field] = "";
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(secret!);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(secret_))));
  open.__enc = `v1.${b64(iv)}.${b64(cipher)}`;
  return JSON.stringify(open);
}

// The profile with its sensitive fields back. `locked` is true when sealed data cannot be opened (a wrong or missing key):
// nothing must be saved over such a profile.
export async function revealProfile(json: string | null | undefined, secret: string | undefined): Promise<{ profile: EmployeeProfile; locked: boolean }> {
  const profile = parseProfile(json);
  let sealed = "";
  try {
    sealed = String((JSON.parse(json || "{}") as { __enc?: unknown }).__enc || "");
  } catch {
    sealed = "";
  }
  if (!sealed) return { profile, locked: false };
  if (!encryptionOn(secret)) return { profile, locked: true };
  try {
    const [, iv, cipher] = sealed.split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await importKey(secret!), unb64(cipher));
    const values = JSON.parse(new TextDecoder().decode(plain)) as Partial<Record<Sensitive, string>>;
    return { profile: normalizeProfile({ ...profile, ...values }).profile, locked: false };
  } catch {
    return { profile, locked: true };
  }
}
