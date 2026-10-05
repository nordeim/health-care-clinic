import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // metadataBase turns relative OG/metadata URLs absolute against the
  // canonical public origin documented in .env.example (NEXT_PUBLIC_SITE_URL
  // — previously declared but never read).
  metadataBase: new URL(siteUrl),
  title: "Green Grove Family Clinic",
  description:
    "Compassionate, whole-person primary care for every generation — chronic care, women's health, pediatrics, vaccinations, laboratory services, and same-day appointments.",
  applicationName: "Health Care Clinic",
  keywords: [
    "family clinic",
    "primary care",
    "pediatrics",
    "women's health",
    "vaccinations",
    "preventive care",
  ],
  openGraph: {
    title: "Green Grove Family Clinic",
    description:
      "Compassionate care that listens, explains, and supports you through every stage of life.",
    type: "website",
  },
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
