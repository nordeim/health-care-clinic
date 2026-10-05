import { describe, expect, it } from "vitest";
import {
  MAX_BODY_BYTES,
  clientKey,
  createRateLimiter,
  readJsonBody,
} from "@/lib/rate-limit";

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

// The body-cap contract (session-10 remediation plan F2/F5):
//  1. A content-length header is the FAST path only — a chunked request
//     (no content-length) previously sailed past the 413 gate and the whole
//     body was buffered in memory before JSON parsing (verified live: a
//     70 KiB chunked POST parsed to a 422). readJsonBody stream-reads with
//     a hard byte cap so the cap holds for EVERY transport shape.
//  2. The boundary is `>` not `>=`: exactly MAX_BODY_BYTES is accepted.
describe("readJsonBody", () => {
  it("parses a valid JSON body posted with a content-length", async () => {
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Ada" }),
    });
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: true,
      value: { fullName: "Ada" },
    });
  });

  it("rejects an honest oversized content-length before reading a byte", async () => {
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_BODY_BYTES + 1),
      },
      body: "x".repeat(1024),
    });
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: false,
      status: 413,
    });
  });

  it("caps a body WITHOUT content-length (stream/chunked shape) at 64 KiB", async () => {
    // A ReadableStream body produces no content-length — the exact shape
    // a Transfer-Encoding: chunked client produces.
    const oversized = "x".repeat(MAX_BODY_BYTES + 1);
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "JSON_BEGIN" + oversized, // not valid JSON — 413 must win before parsing
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: false,
      status: 413,
    });
  });

  it("accepts a stream body exactly AT the boundary (>, not >=)", async () => {
    // `{"pad":"` (8) + pad + `"}` (2) = 10 + pad — pad to exactly 64 KiB.
    const pad = MAX_BODY_BYTES - 10;
    const exact = JSON.stringify({ pad: "y".repeat(pad) });
    expect(exact.length).toBe(MAX_BODY_BYTES);
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: exact,
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: true,
      value: { pad: "y".repeat(pad) },
    });
  });

  it("parses a stream body under the cap", async () => {
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, n: 3 }),
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: true,
      value: { ok: true, n: 3 },
    });
  });

  it("returns 400 for unparseable JSON text", async () => {
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json at all",
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: false,
      status: 400,
    });
  });

  it("returns 400 for an empty body", async () => {
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "",
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: false,
      status: 400,
    });
  });

  it("parses a literal JSON null body fine (route guards non-objects)", async () => {
    // The appointments seam and (after session-10) the login route tolerate
    // non-object bodies with a 422 field map — readJsonBody must hand the
    // parsed null through, never 500.
    const request = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "null",
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request)).resolves.toEqual({
      ok: true,
      value: null,
    });
  });
});
