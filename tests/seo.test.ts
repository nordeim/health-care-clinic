import { beforeEach, describe, expect, it, vi } from "vitest";

// SEO seam contract (session-32, remediation-plan §Part 2 Phase 1): the
// metadata composition for every public route lives in ONE pure seam —
// src/lib/seo.ts — instead of hand-duplicated Metadata objects across five
// page files. The seam is the single source for the site name, the title
// template, the OG image contract, the canonical/OG/twitter composition,
// and the sitemap's public-path allowlist (derived-allowlist doctrine —
// mirrors validation.ts's specialty list: the noindex staff surfaces can
// never leak into the sitemap because the list is defined once, here, and
// pinned by test).
//
// Independent truths (NOT recomputations of the implementation):
//  - 160 chars: the Google SERP description truncation bound.
//  - 1200x630: the OG image aspect (1.91:1) every social card consumer renders.
//  - "en_US": the site's only locale (lang="en").
//  - The public route set: /, /privacy-policy, /accessibility-statement —
//    the reference's complete route table; /login and /dashboard are the
//    documented beyond-parity noindex surfaces (ADR-009).

import {
  MAX_DESCRIPTION_LENGTH,
  OG_IMAGE,
  PUBLIC_PATHS,
  ROOT_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE_TEMPLATE,
  ogTitleFor,
  pageMetadata,
  siteUrl,
} from "@/lib/seo";

describe("seo seam", () => {
  describe("site identity constants", () => {
    it("SITE_NAME is the clinic brand used across every title", () => {
      expect(SITE_NAME).toBe("Green Grove Family Clinic");
    });

    it("SITE_TITLE_TEMPLATE composes page titles with the brand suffix", () => {
      expect(SITE_TITLE_TEMPLATE).toBe("%s — Green Grove Family Clinic");
      expect(SITE_TITLE_TEMPLATE).toContain("%s");
      expect(SITE_TITLE_TEMPLATE.endsWith(SITE_NAME)).toBe(true);
    });

    it("ROOT_DESCRIPTION respects the SERP truncation bound", () => {
      // Independent bound: Google truncates descriptions at ~160 chars.
      expect(ROOT_DESCRIPTION.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
      expect(MAX_DESCRIPTION_LENGTH).toBe(160);
      expect(ROOT_DESCRIPTION.length).toBeGreaterThan(80);
    });
  });

  describe("siteUrl", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    it("falls back to the dev origin when the env is unset", () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      expect(siteUrl()).toBe("http://localhost:3000");
    });

    it("reads NEXT_PUBLIC_SITE_URL when set", () => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://clinic.example");
      expect(siteUrl()).toBe("https://clinic.example");
    });
  });

  describe("PUBLIC_PATHS (the sitemap allowlist)", () => {
    it("contains exactly the three public routes", () => {
      expect([...PUBLIC_PATHS]).toEqual([
        "/",
        "/privacy-policy",
        "/accessibility-statement",
      ]);
    });

    it("never contains the noindex staff surfaces", () => {
      // ADR-009: /login and /dashboard are noindex beyond-parity surfaces;
      // advertising them in the sitemap would contradict their robots metas.
      expect(PUBLIC_PATHS).not.toContain("/login");
      expect(PUBLIC_PATHS).not.toContain("/dashboard");
    });
  });

  describe("ogTitleFor", () => {
    it("keeps the root OG title plain (no suffix)", () => {
      expect(ogTitleFor("Green Grove Family Clinic", "/")).toBe(
        "Green Grove Family Clinic",
      );
    });

    it("suffixes sub-page OG titles with the brand", () => {
      expect(ogTitleFor("Privacy Policy", "/privacy-policy")).toBe(
        "Privacy Policy — Green Grove Family Clinic",
      );
    });
  });

  describe("pageMetadata", () => {
    const meta = pageMetadata({
      title: "Privacy Policy",
      description: "How the clinic handles your information.",
      path: "/privacy-policy",
    });

    it("sets the canonical URL to the page path (resolved against metadataBase)", () => {
      expect(meta.alternates?.canonical).toBe("/privacy-policy");
    });

    it("composes a complete openGraph object (immune to merge semantics)", () => {
      expect(meta.openGraph).toMatchObject({
        title: "Privacy Policy — Green Grove Family Clinic",
        description: "How the clinic handles your information.",
        type: "website",
        url: "/privacy-policy",
        siteName: "Green Grove Family Clinic",
        locale: "en_US",
      });
    });

    it("references the OG image with full dimensions", () => {
      expect(meta.openGraph?.images).toEqual([
        {
          url: OG_IMAGE.path,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: OG_IMAGE.alt,
        },
      ]);
      expect(OG_IMAGE.width).toBe(1200);
      expect(OG_IMAGE.height).toBe(630);
      expect(OG_IMAGE.path).toBe("/og-image.png");
    });

    it("emits a large-image twitter card", () => {
      // toMatchObject (not direct .card access): the Twitter union includes
      // card-less variants, so property access on it fails typecheck.
      expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
    });

    it("keeps the title as a plain string (the root template suffixes it)", () => {
      // The root layout applies SITE_TITLE_TEMPLATE; a suffixed string here
      // would double the suffix ("— Green Grove Family Clinic — Green …").
      expect(meta.title).toBe("Privacy Policy");
      expect(String(meta.title)).not.toContain("—");
    });
  });
});
