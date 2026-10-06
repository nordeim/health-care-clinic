import { LegalPage } from "@/components/site/legal-page";
import { pageMetadata } from "@/lib/seo";

// Title is BARE — the root layout's title.template composes the
// "— Green Grove Family Clinic" suffix exactly once (session-32 F5).
export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Green Grove Family Clinic collects, uses, and retains information submitted through this website.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 30, 2026">
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          Information we collect
        </h2>
        <p className="mt-4">
          When you request an appointment or contact the clinic, we may collect
          your name, email address, phone number, requested specialty,
          preferred appointment date, and the message you provide. We also
          receive basic technical information needed to operate and secure this
          website.
        </p>
      </section>
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          How we use information
        </h2>
        <p className="mt-4">
          We use this information to respond to questions, contact you about
          appointment requests, coordinate clinic services, maintain our
          records, and protect the website from misuse. We do not sell personal
          information or use form submissions for unrelated advertising.
        </p>
      </section>
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          Storage and retention
        </h2>
        <p className="mt-4">
          Form submissions are stored in the clinic&rsquo;s secured application
          database and are accessible only to authorized administrators. We
          retain information only as long as reasonably necessary for care
          coordination, business records, security, and applicable legal
          obligations, then delete or anonymize it.
        </p>
      </section>
      <section>
        <h2 className="text-2xl! leading-tight! text-foreground">
          Your choices
        </h2>
        <p className="mt-4">
          You may ask to access, correct, or delete personal information you
          submitted, subject to legal and recordkeeping requirements. To make a
          privacy request, email{" "}
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
