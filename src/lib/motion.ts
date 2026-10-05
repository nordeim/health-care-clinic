/* Reduced-motion-aware behavior for PROGRAMMATIC scrolling (session-10 F7).
 *
 * `scrollIntoView({ behavior: "smooth" })` is a JS API argument — no CSS
 * `@media (prefers-reduced-motion)` guard can reach it, so the two CTA
 * scroll handlers (hero "Get started", header "Book a visit") animated
 * even for users who asked for reduced motion. Session-8's WCAG sweep
 * covered the hero video, the heartbeat animation and the badge; this
 * helper completes it for scroll behavior.
 *
 * Called from event handlers only (DOM-only, post-hydration) — never during
 * render, so hydration is untouched. */

export function scrollBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}
