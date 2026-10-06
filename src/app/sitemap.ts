import type { MetadataRoute } from "next";
import { PUBLIC_PATHS, siteUrl } from "@/lib/seo";

/* Sitemap (session-32, ADR-011) — the discoverability index, derived from
 * the PUBLIC_PATHS allowlist in src/lib/seo.ts (the same derived-allowlist
 * doctrine as the specialty list in validation.ts: the noindex staff
 * surfaces can never leak in because the list is defined once, pinned by
 * unit test, and mapped over here).
 *
 * lastModified is the BUILD TIME (new Date() at prerender): the site has no
 * per-page content timestamps, and a hardcoded calendar literal would
 * erode (the session-26 F4 anti-time-erosion doctrine). changeFrequency
 * "monthly" reflects a marketing site's realistic change cadence.
 *
 * The route is STATIC — Next prerenders /sitemap.xml at build time, baking
 * the origin from NEXT_PUBLIC_SITE_URL (docs/DEPLOYMENT.md: set it in
 * production, or the locs advertise localhost). */

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_PATHS.map((path) => ({
    // The root entry is the bare origin — the same trailing-slash
    // normalization Next applies to the root canonical URL.
    url: path === "/" ? base : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
}
