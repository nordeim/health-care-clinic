import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/* robots.txt (session-32, ADR-011) — ALLOW-ALL by deliberate decision
 * (remediation plan §1.3):
 *
 *  - /login and /dashboard emit `noindex,nofollow` robots METAS (ADR-009).
 *    Blocking them here too would prevent crawlers from ever seeing those
 *    metas (Google's documented robots.txt × noindex interaction: blocked
 *    pages can still be indexed URL-only from links — strictly worse than
 *    the visible noindex). So the staff surfaces stay crawlable-but-
 *    deindexed, and the e2e spec pins the ABSENCE of Disallow.
 *  - /api GETs are harmless (405/404/JSON) with zero crawl-budget concern
 *    at this scale.
 *
 * The Sitemap reference points at the build-time origin (NEXT_PUBLIC_SITE_URL
 * — docs/DEPLOYMENT.md). */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
