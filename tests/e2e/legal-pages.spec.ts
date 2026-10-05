import { expect, test } from "@playwright/test";

// Legal pages — content + navigation contract ported from the reference.

test.describe("legal pages", () => {
  test("privacy policy renders its sections and back link", async ({ page }) => {
    await page.goto("/privacy-policy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText("Last updated: July 30, 2026")).toBeVisible();

    for (const heading of [
      "Information we collect",
      "How we use information",
      "Storage and retention",
      "Your choices",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    const back = page.getByRole("link", { name: "Back to Green Grove Family Clinic" });
    await expect(back).toHaveAttribute("href", "/");
    await back.click();
    await expect(page).toHaveURL("/");
  });

  test("accessibility statement renders its sections and back link", async ({ page }) => {
    await page.goto("/accessibility-statement");
    await expect(
      page.getByRole("heading", { level: 1, name: "Accessibility Statement" }),
    ).toBeVisible();

    for (const heading of [
      "Our commitment",
      "Accessibility measures",
      "Report a barrier",
      "Contact us",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
  });

  test("footer legal links reach both pages from the landing page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page).toHaveURL("/privacy-policy");

    await page.goto("/");
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Accessibility Statement" })
      .click();
    await expect(page).toHaveURL("/accessibility-statement");
  });
});
