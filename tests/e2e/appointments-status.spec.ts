import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

// Appointment status management (session-16 G1 — the last documented
// backlog item): the dashboard transitions a request through the workflow
// new -> confirmed -> completed via PATCH /api/appointments/[id], plus the
// route's guard/validation edges at the API level.

// Per-run XFF keys (session-16 F2 hardening of the session-14 F2 scheme):
// the fourth segment is the playwright PROCESS PID — every run is a new
// process, and pid recycling requires a full pid_max wrap, so the
// discriminator is structurally unique per run (the previous
// `Date.now() % 200` scheme retained a ~1/200 back-to-back collision).
// The value is NOT a valid IPv4 octet above 255 — the limiter keys on the
// raw XFF token, which requires no IPv4 syntax. Third octets are
// spec-unique: 104 (appointments POST) and 105 (PATCH pins) are disjoint
// from every other spec's bases.
//
// Session-18 F8: the browser-driven requests get the same per-run keys —
// LOGIN_UI_KEY is injected via page.route on the two browser logins (they
// used to land in the shared "unknown" bucket of the login limiter), and
// test 1 injects PATCH_KEY on the StatusButton's browser PATCHes (the
// "unknown" PATCH bucket) — the injection is idempotent with the
// API-level calls that already carry PATCH_KEY explicitly. After this
// change NO request the suite makes touches the "unknown" bucket, within
// or across runs.
const APPOINTMENTS_KEY = `198.51.104.${process.pid}`;
const PATCH_KEY = `198.51.105.${process.pid}`;
const LOGIN_UI_KEY = `198.51.107.${process.pid}`;

/** Injects the per-run XFF key on every login POST this page makes
 * through the browser (the LoginForm island's fetch). */
async function spoofBrowserLoginKey(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/login", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        "X-Forwarded-For": LOGIN_UI_KEY,
      },
    }),
  );
}

/** Injects PATCH_KEY on every PATCH this page makes through the browser
 * (the StatusButton island's fetches) — same key the API-level pins carry
 * explicitly, so the injection is idempotent either way. */
async function spoofBrowserPatchKey(page: import("@playwright/test").Page) {
  await page.route("**/api/appointments/*", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        "X-Forwarded-For": PATCH_KEY,
      },
    }),
  );
}

test.describe("appointment status management", () => {
  test("dashboard transitions a request New -> Confirmed -> Completed", async ({ page }) => {
    await spoofBrowserLoginKey(page);
    await spoofBrowserPatchKey(page);
    // Arrange: a public request lands in the scratch DB through the real API
    // (unique per run — db/e2e.db persists between runs).
    const callerName = `Status E2E Caller ${Date.now()}`;
    const submit = await page.request.post("/api/appointments", {
      headers: { "X-Forwarded-For": APPOINTMENTS_KEY },
      data: {
        fullName: callerName,
        phone: "555-0196",
        specialty: "Primary Care",
        preferredDate: `${new Date().getFullYear() + 1}-03-15`,
      },
    });
    expect(submit.status()).toBe(201);

    // Staff signs in and lands on the dashboard.
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // The submitted row starts in the New state with a Confirm action.
    // The badge is a live region (WCAG 4.1.3 — session-18 F10): the text
    // mutation after router.refresh() is announced to assistive tech.
    const row = page.getByRole("row", { name: new RegExp(callerName) });
    const badge = row.getByText("New", { exact: true });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("role", "status");
    await row.getByRole("button", { name: "Confirm", exact: true }).click();

    // The row refreshes to Confirmed and offers the Complete action.
    await expect(row.getByText("Confirmed", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "Complete", exact: true }).click();

    // Completed is terminal — the badge stays and no further action renders.
    await expect(row.getByText("Completed", { exact: true })).toBeVisible();
    await expect(
      row.getByRole("button", { name: "Confirm", exact: true }),
    ).toHaveCount(0);
    await expect(
      row.getByRole("button", { name: "Complete", exact: true }),
    ).toHaveCount(0);
  });

  test("PATCH /api/appointments/[id] guards and validates at the API level", async ({ page, request }) => {
    await spoofBrowserLoginKey(page);
    // Anonymous PATCH is bounced before any lookup.
    const anonymous = await request.patch("/api/appointments/some-id", {
      headers: { "X-Forwarded-For": PATCH_KEY },
      data: { status: "confirmed" },
    });
    expect(anonymous.status()).toBe(401);

    // Sign in through the browser context so page.request shares the cookie.
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Arrange a row to act on.
    const callerName = `Status API Caller ${Date.now()}`;
    const submit = await page.request.post("/api/appointments", {
      headers: { "X-Forwarded-For": APPOINTMENTS_KEY },
      data: {
        fullName: callerName,
        phone: "555-0195",
        specialty: "Primary Care",
      },
    });
    expect(submit.status()).toBe(201);
    const { id } = (await submit.json()) as { id: string };

    // Invalid status values get the 422 field map (never a 500).
    for (const status of ["cancelled", "New", 42] as unknown[]) {
      const invalid = await page.request.patch(`/api/appointments/${id}`, {
        headers: { "X-Forwarded-For": PATCH_KEY },
        data: { status },
      });
      expect(invalid.status()).toBe(422);
      const body = await invalid.json();
      expect(body.fields).toMatchObject({ status: expect.any(String) });
    }

    // A non-object body gets the same 422 field map (session-10 F1 shape).
    const nullBody = await page.request.patch(`/api/appointments/${id}`, {
      headers: { "X-Forwarded-For": PATCH_KEY },
      data: null,
    });
    expect(nullBody.status()).toBe(422);

    // Unknown ids answer 404 (session-guarded surface — no existence leak
    // concern; only staff reaches this branch).
    const missing = await page.request.patch(
      "/api/appointments/does-not-exist",
      {
        headers: { "X-Forwarded-For": PATCH_KEY },
        data: { status: "confirmed" },
      },
    );
    expect(missing.status()).toBe(404);

    // The authenticated happy path updates and reports the new status.
    const ok = await page.request.patch(`/api/appointments/${id}`, {
      headers: { "X-Forwarded-For": PATCH_KEY },
      data: { status: "completed" },
    });
    expect(ok.status()).toBe(200);
    const body = (await ok.json()) as { ok: boolean; id: string; status: string };
    expect(body).toMatchObject({ ok: true, id, status: "completed" });

    // The dashboard reflects the persisted status.
    await page.goto("/dashboard");
    const row = page.getByRole("row", { name: new RegExp(callerName) });
    await expect(row.getByText("Completed", { exact: true })).toBeVisible();
  });
});
