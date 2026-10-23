// Time-based one-time passwords (RFC 6238, SHA-1, 6 digits, 30 s) for authenticator apps.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string) {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

export const generateSecret = () => base32Encode(crypto.getRandomValues(new Uint8Array(20)));

export async function hotp(secret: Uint8Array, counter: number, digits = 6) {
  const message = new Uint8Array(8);
  new DataView(message.buffer).setBigUint64(0, BigInt(counter));
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
  const offset = mac[mac.length - 1] & 15;
  const code = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 10 ** digits).padStart(digits, "0");
}

export const totp = (secret: string, atMs = Date.now(), digits = 6) => hotp(base32Decode(secret), Math.floor(atMs / 30000), digits);

// One step either side tolerates a slightly wrong clock.
export async function verifyTotp(secret: string, code: string, atMs = Date.now()) {
  const given = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(given)) return false;
  const key = base32Decode(secret);
  const step = Math.floor(atMs / 30000);
  let ok = false;
  for (const offset of [-1, 0, 1]) if ((await hotp(key, step + offset)) === given) ok = true;
  return ok;
}

export const otpauthUri = (label: string, secret: string, issuer = "Joblink") =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
