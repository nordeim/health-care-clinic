import { Reveal } from "./reveal";
import { services } from "@/lib/content";

/* ---------------------------------------------------------------------------
 * Services — the warm gradient band ("It's okay to want more") with the
 * scrolling ECG heartbeat line and the eight stacked-entrance service cards.
 *
 * Gradient parity note (Validation Report, Project Trap Log #3): the
 * reference compiles `bg-gradient-to-b from-service-top via-service-middle
 * to-service-bottom` under Tailwind v3, which emits a browser-native sRGB
 * `linear-gradient(to bottom, …)`. Tailwind v4's gradient utilities emit
 * `in oklab` interpolation, which measurably shifts the intermediate blends.
 * We therefore ship the sRGB-equivalent arbitrary form — byte-identical
 * rendering to the reference.
 *
 * Card entrance: each card carries --card-x / --card-y custom properties
 * (arbitrary-property utilities, identical class strings to the reference);
 * the [data-reveal] CSS in globals.css animates from those offsets to the
 * resting position once the card scrolls into view — the same choreography
 * as the reference's Framer Motion `whileInView`.
 * ------------------------------------------------------------------------- */

/* Per-card entrance offsets + z-index, cycling every four cards — ported
 * verbatim from the reference's class strings. */
const cardPatterns = [
  "lg:z-40",
  "lg:z-30 lg:[--card-x:calc(-100%_-_16px)] lg:[--card-y:0px]",
  "lg:z-20 lg:[--card-x:calc(-200%_-_32px)] lg:[--card-y:0px]",
  "lg:z-10 lg:[--card-x:calc(-300%_-_48px)] lg:[--card-y:0px]",
] as const;

export function Services() {
  return (
    <section
      id="services"
      className="bg-[linear-gradient(to_bottom,var(--service-gradient-top),var(--service-gradient-middle),var(--service-gradient-bottom))] px-8 py-24 text-foreground sm:px-12 lg:px-16 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto flex w-fit flex-col items-center gap-2 text-primary">
          <div className="h-8 w-16 overflow-hidden text-primary" aria-hidden="true">
            <div className="h-full w-24 animate-heartbeat">
              <svg viewBox="0 0 96 32" className="h-full w-full">
                <path
                  d="M0 16 H8 L11 11 L15 23 L19 6 L24 16 H32 H40 L43 11 L47 23 L51 6 L56 16 H64 H72 L75 11 L79 23 L83 6 L88 16 H96"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <p className="section-subtitle text-center">It&rsquo;s okay to want more</p>
        </div>

        <h2 className="mx-auto mt-8 max-w-5xl text-center text-5xl font-medium leading-[1.02] tracking-[-.04em] sm:text-7xl">
          Because your health deserves care built around real life.
        </h2>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Reveal
                key={service.title}
                as="article"
                className={`[--card-x:0px] [--card-y:20px] ${cardPatterns[index % 4]} relative min-h-[220px] rounded-[24px] bg-hero-foreground p-6 text-primary`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-primary/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-medium tracking-[-.03em]">
                  {service.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-primary/80">
                  {service.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
