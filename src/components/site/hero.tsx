"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { heroBadgeMessages } from "@/lib/content";

/* ---------------------------------------------------------------------------
 * Hero — full-viewport autoplaying video with a readability scrim, the
 * four-line display headline, a rotating value badge and the floating
 * appointment teaser card.
 *
 * The badge rotates through three messages (reference: Framer Motion
 * AnimatePresence). This port keys the badge element on the message index
 * and plays a short CSS enter animation (see globals.css) — same visual
 * language without an animation dependency.
 * ------------------------------------------------------------------------- */

export function Hero() {
  const [badgeIndex, setBadgeIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const id = setInterval(
      () => setBadgeIndex((i) => (i + 1) % heroBadgeMessages.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  // WCAG 2.2.2: the hero video autoplays and loops — for users who ask for
  // reduced motion it is pinned to its first frame (poster language) via a
  // DOM-only effect. No state, so hydration is untouched; everyone else
  // sees the reference's untouched autoplay behavior.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof window.matchMedia !== "function") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (reduced.matches) {
        video.pause();
      } else {
        void video.play().catch(() => {
          /* autoplay can be refused — the poster remains; same as before */
        });
      }
    };
    sync();
    reduced.addEventListener("change", sync);
    return () => reduced.removeEventListener("change", sync);
  }, []);

  const badge = heroBadgeMessages[badgeIndex];
  const BadgeIcon = badge.icon;

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      aria-label="Welcome"
      className="relative min-h-[100svh] overflow-hidden bg-primary text-hero-foreground md:min-h-[100svh]"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/media/hero-poster.webp"
        aria-label="A joyful older woman enjoying a healthy life"
      >
        <source src="/media/hero-video.mp4" type="video/mp4" />
      </video>

      <div className="hero-readability-gradient absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-5 pb-5 pt-28 sm:px-8 md:min-h-[100svh] md:pb-7 md:pt-32 lg:max-w-none lg:px-[60px] lg:pb-[60px] lg:pt-[60px]">
        <div className="grid flex-1 items-start gap-6 md:gap-10 lg:grid-cols-[1fr_.9fr_.65fr]">
          <div className="lg:col-span-2 lg:self-center">
            <h1 className="max-w-4xl text-5xl font-medium leading-[.95] tracking-[-.05em] sm:text-7xl lg:text-[clamp(6.25rem,8.5vw,8.5rem)]">
              <span className="block">Health can</span>
              <span className="block">feel hard.</span>
              <span className="block font-semibold">But there</span>
              <span className="block font-semibold">is hope</span>
            </h1>

            <div className="mt-8 flex min-h-14 items-center justify-start">
              <div
                key={badgeIndex}
                className="badge-enter flex items-center gap-2 rounded-full bg-foreground/75 px-5 py-3 text-sm text-hero-foreground backdrop-blur-md"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-hero-foreground/15">
                  <BadgeIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                {badge.text}
              </div>
            </div>
          </div>

          <div className="self-center rounded-[24px] bg-foreground/75 p-5 text-hero-foreground backdrop-blur-md md:absolute md:bottom-7 md:right-8 md:w-[286px] md:p-6 lg:bottom-[60px] lg:right-[60px]">
            <p className="text-sm! leading-relaxed sm:text-lg!">
              Compassionate care that listens, explains, and supports you
              through every stage of life.
            </p>
            <button
              type="button"
              onClick={scrollToContact}
              className="mt-5 inline-flex items-center gap-3 rounded-full bg-hero-foreground px-6 py-3 text-sm font-semibold text-primary md:mt-7"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
