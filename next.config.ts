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
};

export default nextConfig;
