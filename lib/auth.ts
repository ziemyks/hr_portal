// Shared-password session cookie. Web Crypto only, so it runs in middleware (edge) and in route handlers.

export const SESSION_COOKIE = "blt_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (≥ 32 chars).");
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Token = v1.<expiry epoch s>.<hmac>. */
export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = `v1.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [v, exp, sig] = token.split(".");
  if (v !== "v1" || !exp || !sig) return false;
  if (Number(exp) * 1000 < Date.now()) return false;
  return safeEqual(sig, await hmac(`${v}.${exp}`));
}

/** Constant-time password check (compares HMACs so length doesn't leak). */
export async function checkPassword(input: string) {
  const expected = process.env.PORTAL_PASSWORD;
  if (!expected) return false;
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}
