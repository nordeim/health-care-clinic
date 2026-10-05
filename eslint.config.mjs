import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* Lint-gate honesty (session-12 F3): this config used to blanket-disable
 * ~24 rules, which made `bun run lint` materially weaker than the docs
 * advertised. The split is now DELIBERATE and documented:
 *  - ON: every correctness/dep-safety/hygiene rule the codebase is
 *    verifiably clean under (the session-8/10 manual effect audits and
 *    this session's fresh-eyes audit back each one).
 *  - OFF (with rationale): rules that are either false-positive-prone for
 *    TypeScript or that fight the parity doctrine on purpose. */
const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // ---- TypeScript: ON (verified 0 findings) --------------------------
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],

    // ---- React hooks: ON (verified 0 findings — effect hygiene was
    // manually re-audited in sessions 8, 10 and 12) ----------------------
    "react-hooks/exhaustive-deps": "error",
    "react-hooks/purity": "error",

    // ---- Next.js: ON ----------------------------------------------------
    // KNOWN BLIND SPOT (session-14 F1): the plugin's normalizeURL appends a
    // trailing slash to the href (/privacy-policy -> /privacy-policy/) while
    // app-route regexes are built via normalizeAppPath WITHOUT one
    // (^/privacy-policy$) — so only ROOT-href anchors can ever match. The
    // footer's two legal links were plain <a> right through five audits
    // because the rule cannot see them; they were converted to next/link by
    // the session-14 audit, not by this rule. Audits must grep for
    // href="/…" anchors to App-Router pages manually.
    "@next/next/no-html-link-for-pages": "error",

    // ---- General correctness: ON (verified 0 findings) ------------------
    "no-unreachable": "error",
    "no-redeclare": "error",
    "no-fallthrough": "error",
    "no-case-declarations": "error",
    "no-empty": "error",
    "no-debugger": "error",
    "no-useless-escape": "error",
    "no-mixed-spaces-and-tabs": "error",

    // ---- Deliberately OFF (rationale recorded — session-12 F3) ----------

    // False positives on TYPE-ONLY globals (RequestInit, ScrollBehavior,
    // ReadableStream in .ts files): no-undef does not understand TS types;
    // typescript-eslint's own guidance is to disable it for TS code.
    "@typescript-eslint/no-non-null-assertion": "off", // bought exception sites are review-pinned (reveal.tsx)
    "no-undef": "off",

    // Parity doctrine: the reference ports <img> with intrinsic sizes and
    // vendored media — next/image would rewrite loading/bandwidth behavior
    // the parity contract pins.
    "@next/next/no-img-element": "off",

    // Style noise, zero correctness value for this codebase.
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    "prefer-const": "off",
    "no-unused-vars": "off", // superseded by @typescript-eslint/no-unused-vars above
    "no-console": "off", // routes log STRUCTURED errors by doctrine (console.error with prefixes)
    "no-irregular-whitespace": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "delivery/**", "research/**", "tool-results/**", "mini-services/**", ".zscripts/**"]
}];

export default eslintConfig;
