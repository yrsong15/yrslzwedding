// Cookie-based password gate. Uses Web Crypto so it runs in both the Edge
// middleware and Node route handlers.

export const SITE_COOKIE = "site_auth";
export const ADMIN_COOKIE = "admin_auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type Scope = "site" | "admin";

function secret(): string {
  const s = process.env.SITE_SECRET;
  if (!s) throw new Error("SITE_SECRET is not set");
  return s;
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The token is bound to the current password, so changing SITE_PASSWORD or
// ADMIN_PASSWORD logs everyone out.
export async function makeToken(scope: Scope): Promise<string> {
  return hmac(`${scope}:${passwordFor(scope)}`);
}

export async function verifyToken(scope: Scope, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return timingSafeEqual(token, await makeToken(scope));
}

export function passwordFor(scope: Scope): string {
  const pw = scope === "site" ? process.env.SITE_PASSWORD : process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error(`${scope === "site" ? "SITE" : "ADMIN"}_PASSWORD is not set`);
  return pw;
}

export function checkPassword(scope: Scope, attempt: string): boolean {
  return timingSafeEqual(attempt.trim().toLowerCase(), passwordFor(scope).toLowerCase());
}
