import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

// Staff auth — login page, session cookie, dashboard guard, logout.
// The full loop: a public appointment submission becomes visible on the
// authenticated dashboard (form -> API -> SQLite -> dashboard).

test.describe("staff authentication", () => {
  test("login page renders the staff sign-in surface", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Green Grove Family Clinic",
    );
    await expect(
      page.getByText("Staff sign in to review appointment requests."),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  test("wrong credentials show a generic error and set no cookie", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Scoped to the form: Next's route announcer also carries role=alert.
    await expect(page.locator("form").getByRole("alert")).toHaveText(
      /email or password/i,
    );
    // Still on the login page, and no session cookie was issued.
    await expect(page).toHaveURL(/\/login$/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "clinic_session")).toBeUndefined();
  });

  test("dashboard without a session redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("login -> dashboard shows submitted appointments; logout revokes access", async ({ page }) => {
    // Arrange: a public request lands in the scratch DB through the real API.
    // The name is unique per run — db/e2e.db persists between runs (only the
    // schema is re-pushed), and a repeated name would make the dashboard
    // assertions below ambiguous under Playwright's strict mode.
    const callerName = `Dashboard E2E Caller ${Date.now()}`;
    const callerEmail = `dashboard-e2e-${Date.now()}@example.com`;
    const submit = await page.request.post("/api/appointments", {
      data: {
        fullName: callerName,
        phone: "555-0199",
        email: callerEmail,
        specialty: "Women's health",
        preferredDate: `${new Date().getFullYear() + 1}-06-15`,
      },
    });
    expect(submit.status()).toBe(201);

    // Act: staff signs in.
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // The dashboard renders the submitted request.
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Appointment requests" }),
    ).toBeVisible();
    await expect(page.getByText(callerName)).toBeVisible();
    await expect(page.getByText(callerEmail)).toBeVisible();
    await expect(page.getByText("Women's health").first()).toBeVisible();

    // The session cookie is present and httpOnly.
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "clinic_session");
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);

    // Logout clears the cookie and returns to the login surface.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    const afterLogout = await page.context().cookies();
    expect(afterLogout.find((c) => c.name === "clinic_session")).toBeUndefined();

    // The guard now bounces an anonymous dashboard visit.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login rejects a malformed payload with a field map", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "not-an-email", password: "" },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.fields).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
    });
  });
});
