import Link from "next/link";
import { Clock, Copyright, HeartPulse, MapPin, Phone } from "lucide-react";
import { footerContact } from "@/lib/content";

/* Footer — secondary band with the large logo roundel, clinic facts,
 * legal links and the platform credit. */

export function Footer() {
  return (
    <footer className="bg-secondary px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <a
          href="#top"
          className="inline-flex items-center gap-4 text-primary"
          aria-label="Green Grove Family Clinic — back to top"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary">
            <HeartPulse className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
            Green Grove Family Clinic
          </span>
        </a>

        <div className="mt-10 grid gap-6 border-t border-foreground/20 pt-8 text-sm sm:flex sm:items-start sm:justify-between">
          <p className="flex items-start gap-3 leading-5">
            <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              {footerContact.addressLines[0]}
              <br />
              {footerContact.addressLines[1]}
            </span>
          </p>
          <p className="flex items-start gap-3 leading-5">
            <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              {footerContact.hoursLines[0]}
              <br />
              {footerContact.hoursLines[1]}
            </span>
          </p>
          <a
            href={footerContact.phoneHref}
            className="flex items-center gap-3 font-semibold leading-5"
          >
            <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{footerContact.phone}</span>
          </a>
          <nav aria-label="Legal" className="flex flex-col gap-2">
            {/* next/link (session-14 F1): client-side navigation to the
             * App-Router pages, matching the session-12 conversions. These
             * two were invisible to the no-html-link-for-pages lint rule —
             * the plugin normalizes hrefs with a trailing slash while
             * app-route regexes are built without one, so only root-href
             * anchors can ever match (see eslint.config.mjs). */}
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/accessibility-statement" className="hover:underline">
              Accessibility Statement
            </Link>
          </nav>
          <p className="flex items-center gap-3 leading-5">
            <Copyright className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Built on Base44</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
