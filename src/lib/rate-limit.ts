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
