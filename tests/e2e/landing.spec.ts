import { expect, test } from "@playwright/test";

// Landing page — section-by-section content + anchor contract, ported from
// the reference app. Guards the composition (ids drive the nav anchors) and
// the headline copy verbatim.

test.describe("landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // Recorded deviation (docs/Tailwind-V4-Validation-Report.md, session 4):
  // the reference's <title> is the Base44 platform placeholder "Base44 APP";
  // this repo deliberately uses semantic titles. This pin prevents a silent
  // regression of that decision in either direction.
  test("document title is the clinic name (recorded deviation from the reference placeholder)", async ({ page }) => {
    await expect(page).toHaveTitle("Green Grove Family Clinic");
  });

  test("baseline security headers are present on responses (session-14 F3)", async ({ request }) => {
    // Session-14 F3: the audit found zero standard hardening headers and an
    // exposed X-Powered-By. The baseline set (nosniff / frame denial /
    // referrer policy) is applied in next.config.ts for every route —
    // response headers are invisible to rendering, so parity is untouched.
    // A full CSP belongs to the reverse-proxy seam (DEPLOYMENT.md §6).
    //
    // Session-16 F1 coverage refinement: "every route" means every ROUTE
    // RESPONSE and app-level redirect — Next's internal 308 trailing-slash
    // normalization is emitted before headers() applies and carries none
    // of the set. Both edges are pinned below so a framework change that
    // moves either boundary gets noticed.
    const response = await request.get("/");
    expect(response.status()).toBe(200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers()["x-powered-by"]).toBeUndefined();

    // App-level redirects (the dashboard's session guard) carry the set.
    const redirected = await request.get("/dashboard", {
      maxRedirects: 0,
    });
    expect(redirected.status()).toBe(307);
    expect(redirected.headers()["x-content-type-options"]).toBe("nosniff");
    expect(redirected.headers()["x-frame-options"]).toBe("DENY");
    expect(redirected.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );

    // Framework-level 308 (trailing-slash normalization): redirects to the
    // canonical path WITHOUT the security set — the documented limitation
    // (empty-body redirect, ~nil exposure; PAD known-issues table).
    const normalized = await request.get("/privacy-policy/", {
      maxRedirects: 0,
    });
    expect(normalized.status()).toBe(308);
    expect(normalized.headers()["location"]).toBe("/privacy-policy");
    expect(normalized.headers()["x-content-type-options"]).toBeUndefined();
  });

  test("renders the hero with the four-line headline and video", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("Health can");
    await expect(h1).toContainText("feel hard.");
    await expect(h1).toContainText("But there");
    await expect(h1).toContainText("is hope");

    const video = page.locator("section#top video");
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("muted", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");
  });

  test("rotating hero badge cycles its three messages", async ({ page }) => {
    const badge = page.locator("section#top .mt-8 .rounded-full").first();
    await expect(badge).toContainText("Whole-person care");
    await expect(badge).toContainText(/Clear, upfront guidance|Flexible scheduling/, {
      timeout: 8_000,
    });
  });

  test("anchor contract: #about, #services, #insurance, #providers, #contact, #faq", async ({ page }) => {
    for (const id of ["about", "services", "insurance", "providers", "contact", "faq"]) {
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
    }
  });

  test("services section renders all eight cards with icons and numbers", async ({ page }) => {
    const cards = page.locator("section#services article");
    await expect(cards).toHaveCount(8);

    for (const title of [
      "Chronic care",
      "Women's health",
      "Pediatric care",
      "Vaccinations",
      "Laboratory services",
      "Family care",
      "Preventive care",
      "Acute care",
    ]) {
      // Match on the card HEADING (exact) — card descriptions also contain
      // phrases like "preventive care", which would double-match hasText.
      await expect(
        cards.filter({
          has: page.getByRole("heading", { name: title, exact: true }),
        }),
      ).toHaveCount(1);
    }
  });

  test("team section renders the three physicians with quotes", async ({ page }) => {
    for (const name of ["Dr. Jordan Reed", "Dr. Marcus Bennett", "Dr. Maya Chen"]) {
      await expect(page.locator("section#providers article").filter({ hasText: name })).toHaveCount(1);
    }
  });

  test("FAQ accordions toggle open and closed", async ({ page }) => {
    const first = page.locator("section#faq details").first();
    await expect(first).not.toHaveAttribute("open", "");
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator("p")).toContainText("photo ID, insurance card");

    await first.locator("summary").click();
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("CTA buttons smooth-scroll to the contact section", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page.locator("#contact")).toBeInViewport({ timeout: 5_000 });
  });

  test("footer carries the clinic facts and legal links", async ({ page }) => {
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("100 Wellness Way");
    await expect(footer).toContainText("Mon–Fri: 8am–6pm");
    await expect(footer.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy-policy",
    );
    await expect(
      footer.getByRole("link", { name: "Accessibility Statement" }),
    ).toHaveAttribute("href", "/accessibility-statement");
  });

  test("every phone link uses the reference's uniform tel: format", async ({ page }) => {
    // The reference site uses tel:+11234567890 for EVERY phone link; the
    // clone's contact + footer briefly shipped tel:1234567890 (content.ts)
    // — a real parity deviation, fixed and pinned here (session-8 F7).
    const telHrefs = await page.locator("a[href^='tel:']").evaluateAll(
      (links) => links.map((link) => link.getAttribute("href")),
    );
    expect(telHrefs.length).toBeGreaterThanOrEqual(3); // contact + footer + FAQ context (session-18 F9 comment fix — the form-success state never renders in this spec)
    for (const href of telHrefs) {
      expect(href).toBe("tel:+11234567890");
    }
  });
});

test.describe("reduced-motion scrolling (session-10 F7)", () => {
  // Programmatic scrollIntoView({behavior:"smooth"}) is a JS API argument —
  // no CSS media guard can reach it. Session-8's reduced-motion sweep
  // covered the video, heartbeat and badge but not the two CTA scroll
  // handlers. Under prefers-reduced-motion the CTAs must jump instantly.
  test.use({ reducedMotion: "reduce" });

  test("the hero CTA jumps instantly under prefers-reduced-motion", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("button", { name: "Get started" }).click();

    // Instant jump = position STABILITY: the scroll lands in one shot
    // inside the click handler, so an immediate read equals the settled
    // position (a smooth scroll would still be animating — the immediate
    // read catches it partway down a ~5000px journey).
    const immediate = await page.evaluate(() => window.scrollY);
    expect(immediate).toBeGreaterThan(1000); // actually reached the section
    await page.waitForTimeout(800);
    const settled = await page.evaluate(() => window.scrollY);
    expect(Math.abs(settled - immediate)).toBeLessThan(2); // no animation ran
  });
});
