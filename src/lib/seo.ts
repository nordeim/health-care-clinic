import type { Metadata } from "next";

/* ---------------------------------------------------------------------------
 * SEO seam (session-32, ADR-011) — the single source for every search- and
 * social-surface fact about the site: the brand name, the page-title
 * template, the canonical/OG/twitter composition, the OG image contract,
 * and the public-path allowlist that drives the sitemap.
 *
 * Everything this seam produces is HEAD-ONLY metadata: no rendered body
 * markup depends on it, so the parity contracts (page heights, section
 * geometry, rasterized pixels) are structurally unaffected — the same
 * beyond-parity doctrine as the login/dashboard extension (ADR-009).
 *
 * The reference app has NO SEO infrastructure at all (no sitemap, no
 * robots.txt, no meta description — verified against its served HTML), so
 * this entire seam is a documented enhancement, not a parity port.
 *
 * Unit contract: tests/seo.test.ts. Served-surface contract:
 * tests/e2e/seo.spec.ts.
 * ------------------------------------------------------------------------- */

/** The clinic brand — used verbatim in titles, OG site_name, and the template. */
export const SITE_NAME = "Green Grove Family Clinic";

/**
 * Root title template (Next.js `title.template`): sub-pages pass a BARE
 * title and the root composes the brand suffix exactly once. Pages must
 * NOT hand-write the suffix anymore — the e2e title pins
 * (legal-pages.spec.ts) pin the COMPOSED string and guard the atomicity.
 */
export const SITE_TITLE_TEMPLATE = `%s — ${SITE_NAME}`;

/** The Google SERP description truncation bound (~160 chars). */
export const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Root/landing description — trimmed in session-32 from 167 to <=160
 * chars (audit F4) so the SERP snippet never truncates mid-sentence.
 */
export const ROOT_DESCRIPTION =
  "Compassionate, whole-person primary care for every generation — chronic care, women's health, pediatrics, vaccinations, and same-day appointments.";

/** The social-card image (committed at public/og-image.png, 1200x630). */
export const OG_IMAGE = {
  path: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Green Grove Family Clinic — compassionate family care",
} as const;

/**
 * The complete public route table — identical to the reference app's
 * (ADR-009 documents that /login and /dashboard are beyond-parity staff
 * surfaces with noindex robots metas, so they are deliberately absent:
 * the sitemap must never advertise a noindex route).
 */
export const PUBLIC_PATHS = [
  "/",
  "/privacy-policy",
  "/accessibility-statement",
] as const;

/**
 * Canonical public origin. Read at call time (not module load) so the unit
 * suite can exercise both branches. Resolved against .env's
 * NEXT_PUBLIC_SITE_URL; falls back to the dev origin. Production deploys
 * MUST set it (docs/DEPLOYMENT.md) — canonical/OG/sitemap URLs are baked
 * at build time from this value.
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * OG title composition: plain brand at the root, brand-suffixed below it
 * (the title template's logic, applied explicitly for openGraph — Next
 * does not template og:title).
 */
export function ogTitleFor(title: string, path: string): string {
  return path === "/" ? title : `${title} — ${SITE_NAME}`;
}

/**
 * Compose the metadata for a PUBLIC page: title (bare — the root template
 * suffixes it), description, canonical URL, a COMPLETE openGraph object
 * (explicit on every field so the page is immune to root/child metadata
 * merge-semantics changes), and the twitter card.
 *
 * Not for the noindex staff surfaces (login/dashboard): canonical is
 * semantically contradictory there and OG serves no purpose (see the
 * remediation plan §1.3).
 */
export function pageMetadata(input: {
  title: string;
  description: string;
  path: (typeof PUBLIC_PATHS)[number];
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: ogTitleFor(input.title, input.path),
      description: input.description,
      type: "website",
      url: input.path,
      siteName: SITE_NAME,
      locale: "en_US",
      images: [
        {
          url: OG_IMAGE.path,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}
