import { LegalPage } from "@/components/site/legal-page";
import { pageMetadata } from "@/lib/seo";

// Title is BARE — the root layout's title.template composes the
// "— Green Grove Family Clinic" suffix exactly once (session-32 F5).
export const metadata = pageMetadata({
  title: "Accessibility Statement",
  description:
    "Green Grove Family Clinic's commitment to an accessible website, and how to report a barrier.",
  path: "/accessibility-statement",
});

export default function AccessibilityStatementPage() {
  return (
    <LegalPage title="Accessibility Statement" updated="July 30, 2026">
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          Our commitment
        </h2>
        <p className="mt-4">
          Green Grove Family Clinic is committed to providing a website that is
          accessible to people of all abilities. We aim to conform to the Web
          Content Accessibility Guidelines (WCAG) 2.1 Level AA and continually
          work to improve the usability of our digital services.
        </p>
      </section>
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          Accessibility measures
        </h2>
        <p className="mt-4">
          We work to support keyboard navigation, readable color contrast,
          clear heading structure, adaptable layouts, understandable forms, and
          compatibility with commonly used assistive technologies.
          Accessibility is considered as content and features are updated.
        </p>
      </section>
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          Report a barrier
        </h2>
        <p className="mt-4">
          If you experience an accessibility barrier or need information in
          another format, please tell us what page or feature caused difficulty
          and which assistive technology or browser you were using, if
          applicable. We will make reasonable efforts to respond and provide an
          accessible alternative.
        </p>
      </section>
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">Contact us</h2>
        <p className="mt-4">
          Email accessibility feedback to{" "}
          <a href="mailto:info@mysite.com" className="font-semibold text-foreground underline">
            info@mysite.com
          </a>{" "}
          or call{" "}
          <a href="tel:+11234567890" className="font-semibold text-foreground underline">
            123-456-7890
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
