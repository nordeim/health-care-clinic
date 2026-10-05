import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

// The rate-limit contract (session-8 remediation plan F2):
//  1. The limiter is a PURE seam (fixed window, per-key buckets, unref'd
//     sweeper) so the abuse-control feature the README advertises is
//     finally unit-pinned — no 429 existed anywhere in tests/ before.
//  2. clientKey() keys on the LAST X-Forwarded-For token, not the first.
//     Behind an append-style proxy (nginx proxy_add_x_forwarded_for) the
//     last token is the socket address the PROXY appended — the only
//     trustworthy one. A first-token key let any direct client rotate
//     fabricated entries and reset its own quota.

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/x", { headers });
}

describe("clientKey", () => {
  it("keys on the LAST X-Forwarded-For token (proxy-appended address)", () => {
    // Append-style proxy: "client-spoofed, real-socket-addr" → real addr.
    expect(clientKey(requestWithHeaders({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("10.0.0.1");
    expect(clientKey(requestWithHeaders({ "x-forwarded-for": "1.2.3.4,10.0.0.1" }))).toBe("10.0.0.1");
  });

  it("passes a single-token XFF through unchanged", () => {
    // Overwrite-style proxy: the one token IS the proxy-set address.
    expect(clientKey(requestWithHeaders({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("trims whitespace around tokens", () => {
    expect(clientKey(requestWithHeaders({ "x-forwarded-for": "  1.2.3.4  ,  10.0.0.2 " }))).toBe("10.0.0.2");
  });

  it("falls back to x-real-ip when XFF is absent", () => {
    expect(clientKey(requestWithHeaders({ "x-real-ip": "192.0.2.9" }))).toBe("192.0.2.9");
  });

  it("falls back to 'unknown' when no proxy headers exist", () => {
    expect(clientKey(requestWithHeaders({}))).toBe("unknown");
  });

  it("ignores an XFF header that is only separators", () => {
    expect(clientKey(requestWithHeaders({ "x-forwarded-for": " , " }))).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  it("trips exactly on the (max+1)-th request inside one window", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 5, now: () => 0 });
    for (let i = 1; i <= 5; i += 1) {
      expect(limiter.rateLimited("ip-a")).toBe(false);
    }
    expect(limiter.rateLimited("ip-a")).toBe(true); // 6th trips
  });

  it("isolates buckets per key", () => {
    const limiter = createRateLimiter({ windowMs: 10_000, max: 2, now: () => 0 });
    expect(limiter.rateLimited("ip-a")).toBe(false);
    expect(limiter.rateLimited("ip-a")).toBe(false);
    expect(limiter.rateLimited("ip-a")).toBe(true);
    expect(limiter.rateLimited("ip-b")).toBe(false); // untouched
  });

  it("resets the window after windowMs elapses", () => {
    let clock = 0;
    const limiter = createRateLimiter({ windowMs: 10_000, max: 1, now: () => clock });
    expect(limiter.rateLimited("ip-a")).toBe(false);
    expect(limiter.rateLimited("ip-a")).toBe(true);
    clock += 10_001; // window expires
    expect(limiter.rateLimited("ip-a")).toBe(false);
  });

  it("does not extend the window under sustained requests", () => {
    // Fixed window: the reset time is pinned when the bucket opens, so
    // hammering inside the window cannot push the reset further out.
    let clock = 0;
    const limiter = createRateLimiter({ windowMs: 10_000, max: 2, now: () => clock });
    limiter.rateLimited("ip-a"); // bucket opens at t=0
    clock = 9_000;
    limiter.rateLimited("ip-a"); // still window #1
    clock = 9_999;
    expect(limiter.rateLimited("ip-a")).toBe(true);
    clock = 10_000; // window #1 is over
    expect(limiter.rateLimited("ip-a")).toBe(false);
  });
});
