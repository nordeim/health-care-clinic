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

    // The session cookie is present and carries the documented flags:
    // httpOnly + SameSite=Lax always; Secure when NODE_ENV=production —
    // which the e2e standalone server IS, so the production flag is
    // directly observable here (Chrome stores Secure cookies on the
    // http localhost origin because it is a secure context).
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "clinic_session");
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    expect(session?.secure).toBe(true);

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

  test("login tolerates non-object JSON bodies (null/scalar never 500s)", async ({ request }) => {
    // Session-10 F1: `null` is VALID JSON, and property access on it threw
    // outside the parse try/catch — POST /api/auth/login with body `null`
    // returned an unhandled 500 (verified live). The route must answer the
    // same 422 field map the appointments route gives for non-object
    // bodies. Scalar JSON values (42) are included as the sibling shapes.
    const headers = { "X-Forwarded-For": "203.0.113.51" };
    for (const data of [null, 42] as unknown[]) {
      const response = await request.post("/api/auth/login", {
        headers,
        data: data as object,
      });
      expect(response.status()).toBe(422);
      const body = await response.json();
      expect(body.fields).toMatchObject({
        email: expect.any(String),
        password: expect.any(String),
      });
    }
  });

  test("unknown email and wrong password are indistinguishable (no enumeration)", async ({ request }) => {
    // Body/status parity for the two failure paths (session-8 F1). The
    // TIMING half of the contract — scrypt runs on both paths via
    // DUMMY_HASH — is pinned at the unit layer (tests/auth.test.ts); here
    // we pin that nothing about the RESPONSE lets an attacker tell the
    // difference. Dedicated spoofed XFF key keeps the limiter isolated.
    const headers = { "X-Forwarded-For": "203.0.113.50" };
    const unknown = await request.post("/api/auth/login", {
      headers,
      data: { email: "nobody@greengrove.test", password: "whatever-password" },
    });
    const wrong = await request.post("/api/auth/login", {
      headers,
      data: { email: E2E_ADMIN_EMAIL, password: "definitely-not-the-password" },
    });

    expect(unknown.status()).toBe(401);
    expect(wrong.status()).toBe(401);
    const unknownBody = await unknown.json();
    const wrongBody = await wrong.json();
    expect(unknownBody).toEqual(wrongBody);
    expect(unknownBody.error).toBe("Incorrect email or password.");
    // No cookie on either path.
    expect(unknown.headers()["set-cookie"]).toBeUndefined();
    expect(wrong.headers()["set-cookie"]).toBeUndefined();
  });
});
