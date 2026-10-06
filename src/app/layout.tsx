import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import {
  ROOT_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE_TEMPLATE,
  pageMetadata,
  siteUrl,
} from "@/lib/seo";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

/* Root metadata (session-32, ADR-011): the public composition derives from
 * the SEO seam (single source — src/lib/seo.ts, unit-tested). The root
 * adds what only it can provide: metadataBase, the title DEFAULT (the
 * landing page has no page-level metadata) and the TEMPLATE that suffixes
 * every sub-page title exactly once, the keywords, and index/follow.
 * applicationName matches the brand (audit F9 — was the repo name). */
const publicMetadata = pageMetadata({
  title: SITE_NAME,
  description: ROOT_DESCRIPTION,
  path: "/",
});

export const metadata: Metadata = {
  ...publicMetadata,
  metadataBase: new URL(siteUrl()),
  title: {
    default: SITE_NAME,
    template: SITE_TITLE_TEMPLATE,
  },
  applicationName: SITE_NAME,
  keywords: [
    "family clinic",
    "primary care",
    "pediatrics",
    "women's health",
    "vaccinations",
    "preventive care",
  ],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Critical for notched devices: lets the hero bleed into safe areas.
  viewportFit: "cover",
  themeColor: "#264a39",
};

/* Reveal bundle-failure self-heal (session 8): `@media (scripting: enabled)`
 * reflects the browser preference, NOT whether scripts loaded — if the
 * client bundle 404s or is blocked, [data-reveal="hidden"] elements would
 * stay invisible forever. This tiny inline timer (executed during HTML
 * parse, before hydration) flips any still-hidden element to "shown"
 * after 9 seconds; the first Reveal component mount CANCELS it, so when
 * the bundle loads normally the observer owns the choreography and this
 * script changes nothing. Inert for crawlers/no-JS (the CSS keeps those
 * visible anyway). Keep it BEFORE {children} so the timer starts at
 * parse time. */
const REVEAL_FALLBACK_SCRIPT = `window.__revealFallback=setTimeout(function(){var e=document.querySelectorAll('[data-reveal="hidden"]');for(var i=0;i<e.length;i++){e[i].setAttribute("data-reveal","shown")}},9000);`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} bg-background font-sans text-foreground antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: REVEAL_FALLBACK_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
