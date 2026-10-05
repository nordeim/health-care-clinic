"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeartPulse, Menu, X } from "lucide-react";
import { navLinks } from "@/lib/content";
import { scrollBehavior } from "@/lib/motion";

/* ---------------------------------------------------------------------------
 * Site header.
 *
 * Ported from the reference: a fixed transparent bar over the hero video —
 * logo on the left, and a dark-green blurred "pill" on the right containing
 * the desktop nav, the Book-a-visit CTA, and (below `lg`) the hamburger.
 *
 * Mobile navigation contract (pinned by tests/e2e/mobile-navigation.spec.ts):
 *  - The trigger is a real <button> with aria-expanded / aria-controls and a
 *    label that flips between "Open menu" / "Close menu" together with the
 *    Menu <-> X glyph.
 *  - The dropdown panel is `absolute right-0 top-[calc(100%+12px)]` inside
 *    the pill — it is a GRID container (not space-y), so the documented
 *    Tailwind v4 space-y selector rewrite (Validation Report, Project Trap
 *    Log #4) cannot alter its spacing; the links carry their own px/py.
 *  - Activating a menu link closes the panel; the anchor jump itself is the
 *    native instant jump (the reference's html has scroll-behavior: auto).
 *  - Escape and outside-pointer also close the panel.
 *  - Breakpoints are symmetrical with the desktop nav (`hidden lg:flex` nav
 *    vs `lg:hidden` trigger) so no viewport renders both or neither.
 *
 * Scroll state: once the page scrolls past the hero (scrollY >= innerHeight)
 * the logo and its roundel flip from white (hero-foreground) to the dark
 * green (primary) so they stay legible over the light page background —
 * exactly the reference's transition-colors swap. The pill and its contents
 * already read well on both backgrounds and never change.
 * ------------------------------------------------------------------------- */

export function Header() {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(navLinks[0].href);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // One passive listener drives both scroll-driven chrome states:
    //  - pastHero: logo/roundel color swap once the hero scrolls out
    //  - activeSection: the scroll-spy. The reference marks the LAST
    //    nav-tracked section whose top has crossed the viewport's midline
    //    (about/services/insurance, defaulting to about) — the active link
    //    gains `font-semibold` plus the persistent underline
    //    (after:scale-x-100).
    // The `onScroll()` invocation below (initial activation after mount) is
    // sync setState through function indirection — a deliberate, documented
    // exception to the set-state-in-effect smell (SKILL §6.2; CLAUDE.md Code
    // Quality Standards): the initial chrome state depends on the scroll
    // position, which only exists client-side, and computing it at render
    // time would hydration-mismatch.
    const onScroll = () => {
      setPastHero(window.scrollY >= window.innerHeight);
      const line = window.scrollY + window.innerHeight / 2;
      let next: string = navLinks[0].href;
      for (const link of navLinks) {
        const el = document.getElementById(link.href.slice(1));
        if (el && el.getBoundingClientRect().top + window.scrollY <= line) {
          next = link.href;
        }
      }
      setActiveSection(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        menuButtonRef.current?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) === false &&
        menuButtonRef.current?.contains(target) === false
      ) {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  const scrollToContact = useCallback(() => {
    // Reduced-motion users get an instant jump (src/lib/motion.ts,
    // session-10 F7); everyone else keeps the reference's smooth scroll.
    document
      .getElementById("contact")
      ?.scrollIntoView({ behavior: scrollBehavior() });
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-5 sm:px-8 lg:px-0">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between py-5 lg:max-w-none lg:px-[60px]">
        <a
          href="#top"
          className={`flex items-center gap-2 text-sm font-semibold leading-tight transition-colors duration-300 ${
            pastHero ? "text-primary" : "text-hero-foreground"
          }`}
          aria-label="Green Grove Family Clinic — back to top"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
              pastHero ? "border-primary/40" : "border-hero-foreground/40"
            }`}
          >
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
          </span>
          {/* Text group — the wrapper keeps the flex `gap-2` between the
              icon and the words only (no gap between the two lines). */}
          <span>
            <span className="block whitespace-nowrap sm:inline">
              Green Grove
              <span className="hidden sm:inline"> Family</span>
            </span>
            <span className="block whitespace-nowrap sm:ml-1 sm:inline">
              <span className="sm:hidden">Family </span>Clinic
            </span>
          </span>
        </a>

        <div className="flex h-12 items-center rounded-full bg-foreground/80 text-hero-foreground backdrop-blur-md">
          <nav
            aria-label="Primary"
            className="hidden h-full items-center gap-8 whitespace-nowrap pl-8 pr-5 text-sm font-medium lg:flex"
          >
            {navLinks.map((link) => {
              const active = activeSection === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative py-2 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:bg-hero-foreground after:transition-transform after:duration-300 hover:after:scale-x-100 ${
                    active
                      ? "font-semibold after:scale-x-100"
                      : "after:scale-x-0"
                  }`}
                  aria-current={active ? "true" : undefined}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={scrollToContact}
            className="h-full whitespace-nowrap rounded-full bg-hero-foreground px-5 text-sm font-semibold text-primary md:min-w-36"
          >
            Book a visit
          </button>

          <div ref={panelRef} className="relative h-full lg:hidden">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-full w-12 items-center justify-center rounded-full text-hero-foreground"
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            {open ? (
              <nav
                id="mobile-menu"
                aria-label="Mobile"
                className="absolute right-0 top-[calc(100%+12px)] grid min-w-48 overflow-hidden rounded-[24px] bg-foreground/90 p-2 text-sm font-medium text-hero-foreground shadow-lg backdrop-blur-md"
              >
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="whitespace-nowrap rounded-full px-5 py-3 hover:bg-hero-foreground/10"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
