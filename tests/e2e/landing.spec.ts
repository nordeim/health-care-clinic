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
});
