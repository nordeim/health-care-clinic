import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DUMMY_HASH,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  hashPassword,
  signSession,
  verifyLoginPassword,
  verifyPassword,
  verifySession,
} from "@/lib/auth";

/* Staff-auth pure seam (src/lib/auth.ts).
 *
 * Two independent primitives with different threat models:
 *  - Password hashing: scrypt with a per-hash random salt. The stored string
 *    must not be derivable from the password, and identical passwords must
 *    hash differently (salt uniqueness).
 *  - Session tokens: HMAC-SHA256 over `adminId.exp`, verified with a
 *    constant-time comparison. Any mutation of the payload OR the signature
 *    must invalidate the token, and expiry must be enforced.
 * Both must work with an explicit secret so tests stay pure (no env
 * dependency); the env fallback rule is covered separately. */

describe("hashPassword / verifyPassword", () => {
  it("round-trips a correct password", async () => {
    const stored = await hashPassword("s3cret-Password!");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    await expect(verifyPassword("s3cret-Password!", stored)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("s3cret-Password!");
    await expect(verifyPassword("s3cret-Password?", stored)).resolves.toBe(false);
    await expect(verifyPassword("", stored)).resolves.toBe(false);
    await expect(verifyPassword("s3cret-password!", stored)).resolves.toBe(false);
  });

  it("salts every hash — identical passwords never hash alike", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    await expect(verifyPassword("x", "")).resolves.toBe(false);
    await expect(verifyPassword("x", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$zz$zz")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$deadbeef$deadbeef")).resolves.toBe(false);
  });
});

describe("signSession / verifySession", () => {
  it("round-trips a fresh token", () => {
    const token = signSession("admin-123", undefined, "test-secret");
    const session = verifySession(token, "test-secret");
    expect(session).toEqual({ adminId: "admin-123" });
  });

  it("honours a custom TTL (expiry enforced)", () => {
    const token = signSession("admin-123", -1, "test-secret"); // already expired
    expect(verifySession(token, "test-secret")).toBeNull();
  });

  it("uses the documented default TTL", () => {
    expect(SESSION_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
    // A default-TTL token stays valid now and carries exp ≈ now + ttl.
    const token = signSession("admin-123", undefined, "test-secret");
    const exp = Number(token.split(".")[2]);
    const now = Math.floor(Date.now() / 1000);
    expect(exp).toBeGreaterThan(now + SESSION_TTL_SECONDS - 5);
    expect(exp).toBeLessThan(now + SESSION_TTL_SECONDS + 5);
  });

  it("rejects a tampered adminId (signature no longer matches)", () => {
    const token = signSession("admin-123", undefined, "test-secret");
    const parts = token.split(".");
    parts[1] = "admin-999";
    expect(verifySession(parts.join("."), "test-secret")).toBeNull();
  });

  it("rejects a tampered expiry", () => {
    const token = signSession("admin-123", 60, "test-secret");
    const parts = token.split(".");
    parts[2] = String(Number(parts[2]) + 3600);
    expect(verifySession(parts.join("."), "test-secret")).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession("admin-123", undefined, "secret-a");
    expect(verifySession(token, "secret-b")).toBeNull();
  });

  it("rejects malformed tokens without throwing", () => {
    expect(verifySession("", "test-secret")).toBeNull();
    expect(verifySession("v1", "test-secret")).toBeNull();
    expect(verifySession("v1.only-two", "test-secret")).toBeNull();
    expect(verifySession("v2.a.b.c", "test-secret")).toBeNull();
    expect(verifySession("not.a.token", "test-secret")).toBeNull();
  });
});

describe("secret resolution from the environment", () => {
  // TS types process.env as read-only under the active type packages; the
  // runtime allows mutation, which these env-reshaping tests rely on.
  const mutableEnv = process.env as Record<string, string | undefined>;
  const original = mutableEnv.AUTH_SECRET;
  const originalNodeEnv = mutableEnv.NODE_ENV;

  beforeEach(() => {
    delete mutableEnv.AUTH_SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete mutableEnv.AUTH_SECRET;
    else mutableEnv.AUTH_SECRET = original;
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = originalNodeEnv;
  });

  it("falls back to a dev constant when AUTH_SECRET is unset (dev only)", () => {
    mutableEnv.NODE_ENV = "development";
    const token = signSession("admin-123");
    expect(verifySession(token)).toEqual({ adminId: "admin-123" });
  });

  it("reads AUTH_SECRET from the environment when present", () => {
    mutableEnv.NODE_ENV = "development";
    mutableEnv.AUTH_SECRET = "from-env";
    const token = signSession("admin-123");
    expect(verifySession(token, "from-env")).toEqual({ adminId: "admin-123" });
    expect(verifySession(token, "other")).toBeNull();
  });
});

describe("session cookie contract", () => {
  it("uses the documented cookie name", () => {
    expect(SESSION_COOKIE).toBe("clinic_session");
  });
});

describe("login timing equalization (DUMMY_HASH / verifyLoginPassword)", () => {
  // Session-8 remediation F1: the login route used to short-circuit
  // (`admin !== null && verifyPassword(...)`), so unknown-email requests
  // skipped scrypt entirely and answered ~30ms faster than wrong-password
  // requests — a user-enumeration oracle through the timing channel. The
  // seam below lets the route burn identical CPU on BOTH failure paths.
  it("DUMMY_HASH parses as the documented scrypt storage format", () => {
    // Same shape hashPassword() emits — otherwise verifyPassword would
    // bail out early (fast path) and defeat the equalization.
    expect(DUMMY_HASH).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  });

  it("verifyLoginPassword returns false for a null stored hash", async () => {
    await expect(verifyLoginPassword("any-password", null)).resolves.toBe(false);
    await expect(verifyLoginPassword("", null)).resolves.toBe(false);
  });

  it("verifyLoginPassword burns real scrypt time on the null path (no fast-fail)", async () => {
    // scrypt at N=16384 takes ~30ms on this hardware; the non-scrypt path
    // is <1ms. A 10ms floor separates them by an order of magnitude on
    // each side — safe against CI flake while still pinning the contract.
    const started = Date.now();
    await verifyLoginPassword("any-password", null);
    expect(Date.now() - started).toBeGreaterThanOrEqual(10);
  });

  it("verifyLoginPassword delegates to verifyPassword for real hashes", async () => {
    const stored = await hashPassword("correct-horse");
    await expect(verifyLoginPassword("correct-horse", stored)).resolves.toBe(true);
    await expect(verifyLoginPassword("wrong-horse", stored)).resolves.toBe(false);
  });

  it("password verification is ASYNCHRONOUS — the event loop breathes during scrypt", async () => {
    // Session-10 F3: scryptSync blocked the event loop ~30-50ms per login
    // attempt, so a burst of attempts (or XFF-spoofed key rotation against
    // a directly-exposed server) starved EVERY concurrent request —
    // appointments included. The async form burns identical CPU on the
    // libuv threadpool, so the timing-equalization contract is unchanged
    // while the loop stays responsive.
    const pending = verifyLoginPassword("any-password", null);
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).resolves.toBe(false);
  });
});
