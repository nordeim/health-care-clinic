import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// SEO surfaces (session-32, ADR-011) — the served contract for the
// discoverability layer: robots.txt, sitemap.xml, canonical/OG/twitter
// head tags, the OG image asset, and the noindex pins for the staff
// surfaces. Everything here is HEAD-ONLY: no rendered body markup is
// asserted, keeping the parity contracts structurally separate.
//
// ORIGIN NOTE (the LL-11 lesson, from the nextjs-postgresql-single-app
// skill): the sitemap and the head tags are STATIC — their absolute URLs
// are BAKED at `bun run build` time from NEXT_PUBLIC_SITE_URL. The e2e
// server runs on :3100, so every cross-origin fetch in this spec
// host-rewrites the baked origin to the test base URL before requesting
// (never fetch the baked origin itself).
//
// DERIVATION CONTRACT (session-40, the session-34 A4 coupling closed): the
// build resolves the baked origin as ambient NEXT_PUBLIC_SITE_URL → the
// repo .env value → http://localhost:3000 (the siteUrl() fallback in
// src/lib/seo.ts). This spec derives BAKED_ORIGIN from the SAME sources
// with the SAME precedence so the suite stays green under ANY .env
// configuration — the dev default AND a production origin. Source 1:
// process.env.NEXT_PUBLIC_SITE_URL (bun-run loads the repo .env into the
// Playwright process, and ambient env beats .env — identical to what
// `next build` resolves; the playwright.config AUTH_SECRET comment
// documents the same bun-run behavior). Source 2: a direct parse of
// <repo-root>/.env for the `npx playwright test` path (anchored on
// process.cwd() per the documented global-setup.ts precedent — Playwright
// transpiles specs through its CJS loader, so import.meta is unavailable).
// Source 3: the seo.ts dev-default fallback.

function bakedOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv;
  try {
    const envText = readFileSync(join(process.cwd(), ".env"), "utf8");
    const match = envText.match(/^NEXT_PUBLIC_SITE_URL=["']?([^"'\r\n]+?)["']?\s*$/m);
    if (match?.[1]) return match[1];
  } catch {
    // No .env (e.g. CI with env vars only) — fall through to the default.
  }
  return "http://localhost:3000";
}

const BAKED_ORIGIN = bakedOrigin();

test.describe("robots.txt", () => {
  test("serves an allow-all policy with the sitemap reference", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("text/plain");
    const body = await res.text();

    // Allow-all is a DELIBERATE decision (remediation plan §1.3): the
    // staff pages emit noindex metas, and blocking them in robots.txt
    // would HIDE that directive from crawlers (Google's documented
    // interaction). The absent-Disallow pin below keeps a future
    // blanket-block regression from landing silently.
    // Next's generator capitalizes "User-Agent" (RFC 9309 directives are
    // case-insensitive; we pin what our generator actually emits).
    expect(body).toContain("User-Agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain(`Sitemap: ${BAKED_ORIGIN}/sitemap.xml`);
    expect(body).not.toContain("Disallow");
  });
});

test.describe("sitemap.xml", () => {
  test("advertises exactly the three public routes", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("xml");
    const body = await res.text();

    for (const path of ["/", "/privacy-policy", "/accessibility-statement"]) {
      expect(body).toContain(`<loc>${BAKED_ORIGIN}${path === "/" ? "" : path}</loc>`);
    }
    // The noindex staff surfaces must never be advertised (the sitemap
    // allowlist derives from PUBLIC_PATHS — src/lib/seo.ts, unit-pinned).
    expect(body).not.toContain("/login");
    expect(body).not.toContain("/dashboard");
  });

  test("every advertised loc resolves 200 (sitemap parity)", async ({ request }) => {
    // Scandihaven R5-3 pattern: a sitemap that advertises a 404 is worse
    // than no sitemap. Host-rewrite the baked origin to the e2e base URL
    // before fetching (LL-11) — never fetch the baked origin itself.
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBe(3);

    for (const loc of locs) {
      const rewritten = loc.replace(BAKED_ORIGIN, "");
      const page = await request.get(rewritten);
      expect(page.status(), `loc ${loc} must resolve`).toBe(200);
    }
  });
});

test.describe("landing head metadata", () => {
  test("emits canonical, complete openGraph, and the twitter card", async ({ page }) => {
    await page.goto("/");

    const canonical = page.locator('link[rel="canonical"]');
    // Next normalizes the ROOT canonical/og:url to the bare origin (no
    // trailing slash); sub-page paths keep their form.
    await expect(canonical).toHaveAttribute("href", `${BAKED_ORIGIN}`);

    const og = (property: string) =>
      page.locator(`meta[property="${property}"]`);
    await expect(og("og:title")).toHaveAttribute(
      "content",
      "Green Grove Family Clinic",
    );
    await expect(og("og:site_name")).toHaveAttribute(
      "content",
      "Green Grove Family Clinic",
    );
    await expect(og("og:url")).toHaveAttribute("content", `${BAKED_ORIGIN}`);
    await expect(og("og:locale")).toHaveAttribute("content", "en_US");
    await expect(og("og:image")).toHaveAttribute(
      "content",
      `${BAKED_ORIGIN}/og-image.png`,
    );
    await expect(og("og:image:width")).toHaveAttribute("content", "1200");
    await expect(og("og:image:height")).toHaveAttribute("content", "630");

    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  });
});

test.describe("legal page head metadata", () => {
  for (const [path, title] of [
    ["/privacy-policy", "Privacy Policy — Green Grove Family Clinic"],
    ["/accessibility-statement", "Accessibility Statement — Green Grove Family Clinic"],
  ] as const) {
    test(`${path} emits its canonical and a suffixed og:title`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${BAKED_ORIGIN}${path}`,
      );
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
        "content",
        title,
      );
    });
  }
});

test.describe("og image asset", () => {
  test("serves a 1200x630 PNG", async ({ request }) => {
    const res = await request.get("/og-image.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("image/png");

    const buf = await res.body();
    // PNG structure: 8-byte signature, then IHDR with big-endian
    // width@16 / height@20 — a real dimension pin, not a magic-number
    // hand-wave.
    expect(buf.length).toBeGreaterThan(8);
    expect([...buf.slice(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  });
});

test.describe("staff surfaces stay noindex", () => {
  // The ADR-009 contract, first time e2e-pinned: the beyond-parity staff
  // routes are excluded from search engines (robots.txt deliberately does
  // NOT block them — the meta must stay visible to crawlers; see the
  // robots.txt describe above).
  for (const path of ["/login", "/dashboard"]) {
    test(`${path} emits a noindex robots meta`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
    });
  }
});
