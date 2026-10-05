"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ---------------------------------------------------------------------------
 * Reveal-on-scroll choreography.
 *
 * The reference app drives its service cards and the appointment panel with
 * Framer Motion `whileInView`: elements start at
 * `translateX(var(--card-x)) translateY(var(--card-y))` + opacity 0 (the
 * --card-x/--card-y values come from arbitrary-property Tailwind classes on
 * each card) and settle to their natural position once scrolled into view.
 *
 * This port reproduces the exact same choreography with an
 * IntersectionObserver plus the `[data-reveal]` CSS transitions declared in
 * globals.css — no animation library required.
 *
 * Degradation contract:
 *  - Server and client render the SAME initial markup (`data-reveal="hidden"`)
 *    so hydration never mismatches; the hiding CSS itself is scoped to
 *    `@media (scripting: enabled)`, so no-JS visitors and crawlers always
 *    see the final state.
 *  - Browsers without IntersectionObserver predate the `scripting` media
 *    feature, so the CSS keeps them visible too — the observer hook simply
 *    never fires.
 *  - prefers-reduced-motion pins content visible with no transition.
 * ------------------------------------------------------------------------- */

export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      // Fire once the element peeks into the viewport (Framer's default
      // whileInView threshold is "some amount visible", 0.15 is a close feel).
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref as never}
      data-reveal={shown ? "shown" : "hidden"}
      className={className}
    >
      {children}
    </Tag>
  );
}
