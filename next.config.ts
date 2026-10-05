import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin file tracing to this project so the standalone server always lands
  // at .next/standalone/server.js — even when the repo is cloned inside a
  // parent workspace that has its own lockfile.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
  // No ignoreBuildErrors: `tsc --noEmit` is part of the verification gate
  // AND the build itself enforces types — the "TypeScript strict" claim in
  // the docs is backed by both layers now (session-8 config hygiene).
  // StrictMode stays off deliberately: dev-only double-invocation changes
  // behavior the parity contract pins (reveal choreography timing, badge
  // rotation phase); effect cleanup + dependency hygiene is instead
  // re-verified per audit session AND enforced by the enabled
  // react-hooks/exhaustive-deps + purity lint rules (session-12 F5).
  reactStrictMode: false,
  // Next 16 dev-origin protection silently blocks dev chunks when the page
  // is reached through 127.0.0.1 instead of localhost (symptom: unhydrated
  // document, native form GET fallbacks). Restores both origins.
  // (Validation Report, Project Trap Log — session-12 methodology finding c.)
  allowedDevOrigins: ["127.0.0.1"],
  // Keep the dev overlay out of screenshots and screen recordings.
  devIndicators: false,
  // Session-14 F3: stop advertising the framework (X-Powered-By header).
  poweredByHeader: false,
  // Session-14 F3: baseline security headers on every route RESPONSE and
  // app-level redirect (session-16 F1 wording fix: Next's internal 308
  // trailing-slash normalization is emitted BEFORE headers() applies and
  // carries none of the set — documented limitation, e2e-pinned).
  // headers are invisible to rendering — parity is untouched (the e2e
  // header pin lives in landing.spec.ts). Each is safe for this app:
  //  - nosniff: no MIME confusion consumers exist, but it is free defense.
  //  - X-Frame-Options DENY: nothing legitimately frames the clinic site.
  //  - Referrer-Policy strict-origin-when-cross-origin: no feature reads
  //    referrers; cross-origin navigations only leak the origin.
  // A full CSP (the reveal self-heal inline <script> would need a hash or
  // nonce) belongs to the reverse-proxy seam — see docs/DEPLOYMENT.md §6.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
