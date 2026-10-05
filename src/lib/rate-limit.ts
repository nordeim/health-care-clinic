/* ---------------------------------------------------------------------------
 * Shared request-shape helpers for the public POST endpoints
 * (ADR-005 doctrine: manual validation + fixed-window in-memory limiting —
 * single-process dev/standalone deployment shape, see DEPLOYMENT.md).
 *
 * Extracted from the route files in session 8 so the abuse-control
 * contract is unit-pinnable (tests/rate-limit.test.ts).
 * ------------------------------------------------------------------------- */

/** Rate-limit key for a request.
 *
 * Keys on the LAST `X-Forwarded-For` token: behind an append-style proxy
 * (nginx `proxy_add_x_forwarded_for`) the last token is the socket address
 * the PROXY appended — the only trustworthy one. Keying on the first token
 * (the pre-session-8 behavior) let any direct client rotate fabricated XFF
 * entries and get a fresh bucket per request, fully bypassing the limit.
 * An overwrite-style proxy (single token) works identically.
 *
 * Known limitation, documented in DEPLOYMENT.md §6: App Router route
 * handlers cannot read the socket address, so a DIRECTLY exposed server
 * can still be spoofed via a fabricated XFF — deploy behind the mandated
 * proxy. All proxy-less requests (e.g. local dev) share the "unknown"
 * bucket by design.
 */
export function clientKey(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").pop()?.trim();
    if (last) return last;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimiter = {
  /** Records the request; returns true when the key is OVER the limit. */
  rateLimited(key: string): boolean;
};

/** Fixed-window per-key limiter. The reset time is pinned when a bucket
 * opens — sustained traffic inside a window cannot push the reset out.
 * Buckets are swept opportunistically so the map cannot grow without
 * bound under address rotation. `now` is injectable for tests only. */
export function createRateLimiter({
  windowMs,
  max,
  now = () => Date.now(),
}: {
  windowMs: number;
  max: number;
  now?: () => number;
}): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  const rateLimited = (key: string): boolean => {
    const timestamp = now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= timestamp) {
      buckets.set(key, { count: 1, resetAt: timestamp + windowMs });
      return false;
    }
    bucket.count += 1;
    return bucket.count > max;
  };

  // Opportunistic sweep — never hold the process open for it.
  if (typeof setInterval === "function") {
    const timer = setInterval(() => {
      const timestamp = now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= timestamp) buckets.delete(key);
      }
    }, windowMs);
    (timer as unknown as { unref?: () => void }).unref?.();
  }

  return { rateLimited };
}

/** Hard cap on request bodies (App Router route handlers buffer the whole
 * JSON body in memory with no built-in limit — the old Pages API 4MB guard
 * does not apply). Oversized submissions get a 413 before any parsing. */
export const MAX_BODY_BYTES = 64 * 1024;

export function bodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

/* The result of a capped JSON body read: either the parsed value (ANY JSON
 * shape — objects, null, scalars; route-level guards handle non-objects)
 * or a failure status the caller renders. */
export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 413 | 400 };

/** Reads and parses a JSON request body with the 64 KiB cap enforced for
 * EVERY transport shape (session-10 F2).
 *
 * The content-length header is only a FAST path — a chunked request (or
 * any stream without content-length) used to sail past the 413 gate and
 * buffer an unbounded body in memory before `request.json()` failed. This
 * seam stream-reads the body and aborts the moment the byte count crosses
 * the cap (cancelling the reader releases the socket), so the memory
 * ceiling holds no matter how the client frames the request. */
export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  if (bodyTooLarge(request)) {
    return { ok: false, status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    // No body stream at all — indistinguishable from unparseable JSON.
    return { ok: false, status: 400 };
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BODY_BYTES) {
        // Cancel releases the socket instead of draining an oversized body.
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    // Transport-level failure (session-12 F2): a client that hangs up
    // mid-body rejects reader.read() with a socket error (ECONNRESET et
    // al.). The throw used to escape the seam AND the routes' call sites
    // (both call readJsonBody outside their try/catch) — an unhandled
    // framework error plus a misleading 200 access-log line. Cancel
    // best-effort and degrade to the standard 400: the request never
    // completed, so it is indistinguishable from an unparseable body.
    await reader.cancel().catch(() => {});
    return { ok: false, status: 400 };
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch {
    return { ok: false, status: 400 };
  }
}
