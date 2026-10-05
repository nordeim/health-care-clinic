import type { ReactNode } from "react";

/* Shared layout for the two legal pages (privacy policy, accessibility
 * statement) — ported from the reference: narrow article, back link,
 * display h1, "last updated" line, then section blocks. */

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground sm:px-8 lg:px-[60px] lg:py-24">
      <article className="mx-auto max-w-3xl">
        <a
          href="/"
          className="text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Green Grove Family Clinic
        </a>
        <h1 className="mt-10 text-5xl font-medium tracking-[-.04em] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <div className="mt-12 space-y-10 leading-relaxed text-muted-foreground">
          {children}
        </div>
      </article>
    </main>
  );
}
