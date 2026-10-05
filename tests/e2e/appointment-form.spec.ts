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
    // Dedicated spoofed XFF key: every API-level test gets an isolated
    // limiter bucket so the shared "unknown" bucket (used by the
    // browser-driven POSTs below) can never be exhausted by the suite
    // itself (session-8 F20).
    const response = await request.post("/api/appointments", {
      headers: { "X-Forwarded-For": "203.0.113.1" },
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

  test("a non-object JSON body gets the 422 field map, never a 500", async ({ request }) => {
    // Route-level pin of the seam's documented non-object tolerance
    // (session-10 F1 mirror): `null` is valid JSON; the seam turns it into
    // an empty record and the route answers the standard 422 field map.
    const response = await request.post("/api/appointments", {
      headers: { "X-Forwarded-For": "203.0.113.4" },
      data: null as unknown as object,
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.fields).toMatchObject({
      fullName: expect.any(String),
      phone: expect.any(String),
    });
  });

  test("server-side validation rejects impossible calendar dates (no JS rollover)", async ({ request }) => {
    // 2025-02-31 used to parse as March 3 and PERSIST as garbage — the
    // validation seam now round-trips the components (session-8 F4).
    for (const preferredDate of ["2025-02-31", "2025-04-31", "2025-02-30"]) {
      const response = await request.post("/api/appointments", {
        headers: { "X-Forwarded-For": "203.0.113.2" },
        data: {
          fullName: "Calendar Probe",
          phone: "555-0199",
          specialty: "Primary Care",
          preferredDate,
        },
      });
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body.fields?.preferredDate).toBe("Pick today or a future date.");
    }
  });

  test("422 field errors render per-field in the UI with aria wiring", async ({ page }) => {
    // "Al" passes NATIVE validation (no minlength) but fails the server's
    // 3-char floor — the exact path that used to show "check the highlighted
    // fields" with nothing highlighted (session-8 F3).
    await page.getByLabel("Full name").fill("Al");
    await page.getByLabel("Phone number").fill("555-0100");
    await page.getByRole("button", { name: "Request my visit" }).click();

    const nameInput = page.getByLabel("Full name");
    await expect(page.locator("#fullName-error")).toBeVisible();
    await expect(page.locator("#fullName-error")).toHaveText(
      "Full name must be between 3 and 120 characters.",
    );
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
    await expect(nameInput).toHaveAttribute("aria-describedby", "fullName-error");
    // The generic headline alert is scoped to the form (route announcer).
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "check the highlighted fields",
    );
    // User input survives the failure.
    await expect(nameInput).toHaveValue("Al");
  });

  test("rate limiter trips to 429 under a dedicated spoofed XFF key", async ({ request }) => {
    // 6 VALID requests under ONE fabricated XFF key (isolated bucket —
    // never poisons the shared "unknown" bucket the browser-driven specs
    // use). Behind a real proxy the LAST token is the proxy-appended
    // socket address, so this also pins the keying the limiter actually
    // uses (session-8 F2). The five persisted probe rows are inert — no
    // spec asserts the "Limiter Probe" name with a strict locator.
    //
    // The key is UNIQUE PER RUN (session-10 F6): the standalone server's
    // limiter state is in-memory, and with `reuseExistingServer` an
    // operator-left server on :3100 would carry the previous run's bucket
    // for a fixed key — the first POST would 429 and the 201 assertion
    // below would fail. A per-run key makes the bucket provably fresh.
    const headers = { "X-Forwarded-For": `203.0.113.${(Date.now() % 200) + 10}` };
    for (let i = 0; i < 5; i += 1) {
      const response = await request.post("/api/appointments", {
        headers,
        data: { fullName: "Limiter Probe", phone: "555-0198", specialty: "Primary Care" },
      });
      expect(response.status()).toBe(201);
    }
    const sixth = await request.post("/api/appointments", {
      headers,
      data: { fullName: "Limiter Probe", phone: "555-0198", specialty: "Primary Care" },
    });
    expect(sixth.status()).toBe(429);
  });

  test("oversized bodies are rejected with 413 before parsing", async ({ request }) => {
    // Per-run key (session-10 F6): the 413 check runs after the limiter
    // counts the request, so a leftover server's bucket for a fixed key
    // could turn this into a 429. A fresh key keeps the assertion about
    // the body cap.
    const response = await request.post("/api/appointments", {
      headers: { "X-Forwarded-For": `198.51.100.${(Date.now() % 200) + 10}` },
      data: { fullName: "x".repeat(70 * 1024), phone: "555-0197", specialty: "Primary Care" },
    });
    expect(response.status()).toBe(413);
    const body = await response.json();
    expect(body.error).toContain("too large");
  });

  test("health endpoint reports database readiness", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toMatchObject({ ok: true, database: "up" });
  });
});
