import type { Metadata } from "next";
import { LoginForm } from "@/components/dashboard/login-form";

/* Staff sign-in — an intentional EXTENSION beyond the reference app (which
 * has no login; its complete route table is /, /privacy-policy,
 * /accessibility-statement). The page is deliberately NOT linked from the
 * landing page so the public experience stays byte-faithful to the
 * reference; staff reach it by URL. noindex keeps the admin surface out of
 * search engines. */

export const metadata: Metadata = {
  title: "Staff sign in — Green Grove Family Clinic",
  description: "Staff access to the Green Grove appointment dashboard.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <LoginForm />
    </main>
  );
}
