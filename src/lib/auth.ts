import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type BinaryLike,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/* ---------------------------------------------------------------------------
 * Staff authentication — pure primitives (no database access).
 *
 * Two independent seams with different threat models:
 *
 *  1. Password hashing — scrypt (memory-hard) with a per-hash random salt.
 *     Stored format: `scrypt$<saltHex>$<hashHex>`. Verification is
 *     constant-time over the derived hash. This is a self-contained
 *     alternative to pulling in bcrypt/argon2 native modules; scrypt ships
 *     with Node and is OWASP-approved for password storage.
 *
 *  2. Session tokens — HMAC-SHA256 over `<adminId>.<expEpoch>` with
 *     AUTH_SECRET. Token format: `v1.<adminId>.<expEpoch>.<sigHex>`.
 *     Verification recomputes the signature and compares it in constant
 *     time, then enforces the expiry. Pinned by tests/auth.test.ts.
 *
 * The signing secret resolves from AUTH_SECRET. In production an unset
 * secret fails fast (signing throws); in development it falls back to a
 * fixed constant with a one-time console warning so local setups keep
 * working out of the box.
 *
 * scrypt is ASYNC (session-10 F3): the sync form blocked the event loop
 * ~30-50ms per derivation, so login bursts (or XFF-spoofed key rotation
 * against a directly-exposed server) starved every concurrent request.
 * The promisified form burns IDENTICAL CPU on the libuv threadpool —
 * the timing-equalization contract is unchanged.
 * ------------------------------------------------------------------------- */

const scrypt = promisify(scryptCallback) as (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

export const SESSION_COOKIE = "clinic_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // one week

const DEV_FALLBACK_SECRET = "insecure-dev-only-secret-change-me";
const SCRYPT_KEYLEN = 32;
const SCRYPT_COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

let warnedFallback = false;

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET must be set in production (generate with `openssl rand -hex 32`).",
    );
  }
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[auth] AUTH_SECRET is not set — using an insecure dev-only fallback. Set AUTH_SECRET in .env.",
    );
  }
  return DEV_FALLBACK_SECRET;
}

/* ------------------------------ passwords -------------------------------- */

/** A syntactically valid scrypt hash of an unguessable random password.
 *
 * Used ONLY by the login route to equalize response time when the email
 * is unknown: scrypt is CPU-heavy (~30ms at N=16384), and skipping it for
 * unknown emails would leak which addresses exist through a timing side
 * channel. Verifying against this constant burns the same CPU as a real
 * check and always fails — the pre-image is random discarded bytes. */
export const DUMMY_HASH =
  "scrypt$daf2d6ea27aeab7b97a47620e25df4ed$803bcf38b0a949855b9e021375fc9f3f5ba8494408755abc5e0ebc96f25cb484";

/** Password check for the login route — ALWAYS runs scrypt, even when no
 * account exists (storedHash null → verifies against DUMMY_HASH), so the
 * unknown-email and wrong-password paths take indistinguishable time.
 * Callers decide success separately (`admin !== null && ok`) AFTER this
 * call — never short-circuit around it. */
export async function verifyLoginPassword(
  password: string,
  storedHash: string | null,
): Promise<boolean> {
  return verifyPassword(password, storedHash ?? DUMMY_HASH);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_COST);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length !== SCRYPT_KEYLEN) return false;
  const actual = await scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_COST);
  return timingSafeEqual(actual, expected);
}

/* ------------------------------- sessions -------------------------------- */

function signature(adminId: string, exp: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${adminId}.${exp}`)
    .digest("hex");
}

export function signSession(
  adminId: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
  secret: string = authSecret(),
): string {
  if (!/^[^.]+$/.test(adminId)) {
    throw new Error("adminId must be a non-empty string without dots");
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `v1.${adminId}.${exp}.${signature(adminId, exp, secret)}`;
}

export function verifySession(
  token: string,
  secret: string = authSecret(),
): { adminId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, adminId, expRaw, sig] = parts;
  if (!/^[^.]+$/.test(adminId)) return null;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  const expected = signature(adminId, exp, secret);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? { adminId } : null;
}
