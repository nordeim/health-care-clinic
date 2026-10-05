import { expect, test } from "@playwright/test";

// Mobile navigation (390×844 — the reference's mobile chrome).
//
// This is the highest-regression-risk chrome on the page AND the surface
// where the documented Tailwind v3→v4 engine traps bite hardest:
//
//  - Trap #1 (bare-HSL transparent theme): the pill and the dropdown are
//    `bg-foreground/80` and `bg-foreground/90` — if the `@theme inline`
//    tokens ever regress to bare HSL triplets, these compute to fully
//    TRANSPARENT paint. The computed-style assertions below pin the exact
//    sRGB the reference renders.
//  - Trap #4 (space-y selector rewrite): the dropdown is a GRID container
//    (not space-y), so the v4 `:where()` specificity rewrite cannot alter
//    its spacing — the panel height assertion pins the layout.
//  - Breakpoint symmetry: `hidden lg:flex` nav vs `lg:hidden` trigger must
//    hand over exactly at 1024px — no ghost menu, no dead zone.
//
// Reference behavior, re-verified against the live app:
//   trigger = real <button>, aria-expanded + aria-controls, label flips
//   "Open menu" <-> "Close menu" with Menu <-> X glyphs; panel is
//   `absolute right-0 top-[calc(100%+12px)]` inside the pill; activating a
//   link closes the panel and jumps to the section anchor (instant jump —
//   the reference's html has scroll-behavior: auto).

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hamburger renders with correct ARIA contract; desktop nav hidden", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open menu" });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveAttribute("aria-controls", "mobile-menu");

    // The pill itself stays visible on mobile (Book a visit + hamburger).
    await expect(page.getByRole("button", { name: "Book a visit" })).toBeVisible();

    // Desktop link nav must NOT render below lg.
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeHidden();
  });

  test("pill and dropdown paint the reference colors (v4 trap #1 guard)", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open menu" });

    // Sample the actual RENDERED pixel: Tailwind v4 opacity modifiers
    // surface as `oklab(...)` color-mix results in computed styles (the v3
    // reference surfaced `rgba(...)`), so string comparisons are meaningless
    // across engines. Rasterizing 1px through a canvas proves the PAINT —
    // which is what the trap guard actually protects: a bare-HSL regression
    // resolves to fully transparent.
    const renderedPixel = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = getComputedStyle(el).backgroundColor;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      });

    // Rasterize and compare with a ±1 tolerance per channel: v4's
    // color-mix(in oklab, …) roundtrips the base color through oklab and
    // can shift one channel by one quantization step (e.g. 38 -> 37),
    // which is invisible in paint — while a bare-HSL regression would
    // collapse to [0, 0, 0, 0], which the near() helper below rejects.
    const near = (pixel: number[], expected: number[]) =>
      pixel.every(
        (channel, index) => Math.abs(channel - expected[index]) <= 1,
      );

    // The pill: bg-foreground/80 -> rgb(38 74 57 / 0.8).
    const pill = await renderedPixel("header div.h-12");
    expect(near(pill, [38, 74, 57, 204])).toBe(true);

    await trigger.click();
    const panel = page.locator("#mobile-menu");
    await expect(panel).toBeVisible();
    // The dropdown: bg-foreground/90 -> rgb(38 74 57 / 0.9).
    const dropdown = await renderedPixel("#mobile-menu");
    expect(near(dropdown, [38, 74, 57, 230])).toBe(true);
    expect(dropdown[3]).toBeGreaterThan(200); // opaque-ish, NOT transparent
    // Trap #4 guard: grid container, links carry their own padding — the
    // panel height is 3 rows of (py-3*2 + line-height) + p-2*2.
    const height = await panel.evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThan(100);
    expect(height).toBeLessThan(200);
  });

  test("opening and closing swaps the glyph and ARIA state", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();

    const openTrigger = page.getByRole("button", { name: "Close menu" });
    await expect(openTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#mobile-menu")).toBeVisible();

    await openTrigger.click();
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.locator("#mobile-menu")).toBeHidden();
  });

  test("activating a menu link closes the panel and jumps to the anchor", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();

    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Services" }).click();

    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page).toHaveURL(/#services$/);

    // The services section actually scrolled into view.
    const inView = await page.evaluate(() => {
      const el = document.getElementById("services");
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    expect(inView).toBe(true);
  });

  test("Escape closes the menu and restores focus to the trigger", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    await expect(page.locator("#mobile-menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("pointerdown outside the panel closes the menu", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    await expect(page.locator("#mobile-menu")).toBeVisible();

    // Tap far below the fixed header (the hero floating card area) so the
    // tap point is not swallowed by the fixed header subtree.
    await page.getByRole("button", { name: "Get started" }).tap();
    await expect(page.locator("#mobile-menu")).toBeHidden();
  });
});

test.describe("navigation breakpoint symmetry", () => {
  test("at exactly lg (1024px) the desktop nav hands over from the trigger", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();

    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });
});
