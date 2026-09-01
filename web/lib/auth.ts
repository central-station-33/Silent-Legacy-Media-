// Uses Web Crypto (available in both the Node.js and Edge runtimes) instead
// of Node's `crypto` module so this file is safe to import from middleware,
// which runs on the Edge runtime by default.

const COOKIE_NAME = "sl_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toHex(sig);
}

export async function createSessionToken(): Promise<string> {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${await hmac(issuedAt)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [issuedAt, sig] = token.split(".");
  if (!issuedAt || !sig) return false;
  const expected = await hmac(issuedAt);
  if (!timingSafeEqualStr(expected, sig)) return false;
  const age = (Date.now() - Number(issuedAt)) / 1000;
  return age >= 0 && age < MAX_AGE_SECONDS;
}

export function checkPassword(candidate: string): boolean {
  const real = process.env.APP_PASSWORD;
  if (!real) throw new Error("APP_PASSWORD is not set");
  return timingSafeEqualStr(real, candidate);
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
