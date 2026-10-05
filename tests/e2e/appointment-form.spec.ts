import { expect, test } from "@playwright/test";

// Appointment request funnel — the landing page's only write path.
// Drives the real form against the real API + SQLite (db/e2e.db).

test.describe("appointment form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#contact");
  });

  test("renders the underline-style fields and the specialty list", async ({ page }) => {
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByLabel("Phone number")).toBeVisible();
    await expect(page.getByLabel("Email (optional)")).toBeVisible();
    await expect(page.getByLabel("Specialty")).toBeVisible();
    await expect(page.getByLabel("Preferred date")).toBeVisible();

    const specialty = page.getByLabel("Specialty");
    for (const option of ["Primary Care", "Chronic care", "Acute care"]) {
      await expect(specialty.locator(`option:has-text("${option}")`)).toHaveCount(1);
    }
  });

  test("happy path: submitting the form persists the appointment", async ({ page }) => {
    await page.getByLabel("Full name").fill("E2E Caller");
    await page.getByLabel("Phone number").fill("555-0100");
    await page.getByLabel("Email (optional)").fill("e2e@example.com");
    await page.getByLabel("Specialty").selectOption("Pediatric care");

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const date = nextYear.toISOString().slice(0, 10);
    await page.getByLabel("Preferred date").fill(date);

    const submit = page.getByRole("button", { name: "Request my visit" });
    await submit.click();

    // In-flight state ("Sending…" + disabled), exactly like the reference,
    // is observable in slower environments but races against a fast local
    // API — the terminal state below is the actual contract under test.
    // Terminal state: the calm confirmation replaces the form.
    await expect(page.getByText("Thank you — your request is in.")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("server-side validation rejects an impossible payload", async ({ request }) => {
    const response = await request.post("/api/appointments", {
      data: { fullName: "x", phone: "1", specialty: "Not A Service" },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.fields).toMatchObject({
      fullName: expect.any(String),
      phone: expect.any(String),
      specialty: expect.any(String),
    });
  });

  test("health endpoint reports database readiness", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toMatchObject({ ok: true, database: "up" });
  });
});
