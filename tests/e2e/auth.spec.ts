import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

// Staff auth — login page, session cookie, dashboard guard, logout.
// The full loop: a public appointment submission becomes visible on the
// authenticated dashboard (form -> API -> SQLite -> dashboard).

// Per-run XFF keys (session-16 F2 hardening of the session-14 F2 scheme):
// the fourth segment is the playwright PROCESS PID — every run is a new
// process, and pid recycling requires a full pid_max wrap, so the
// discriminator is structurally unique per run (the previous
// `Date.now() % 200` scheme retained a ~1/200 back-to-back collision).
// The value is not a valid IPv4 octet above 255 — the limiter keys on the
// raw XFF token, which requires no IPv4 syntax. Third octets are
// spec-unique: no two specs in this file share a base, and the
// login-limiter pin below uses 198.51.100.x (which collides only with
// appointment-form.spec's 413 key — a different route and limiter map).
//
// Session-18 F8: the browser-driven requests get the same per-run keys —
// LOGIN_UI_KEY is injected via page.route on the two browser login tests
// (4 XFF-less login POSTs per run used to land in the shared "unknown"
// bucket vs the 10/10-min limit — a third consecutive run against a
// reuseExistingServer instance would 429-flake), and the page.request
// appointments POST carries APPOINTMENTS_UI_KEY explicitly (it was the
// 6th "unknown"-bucket POST that 429-flaked run 2 of the double-run
// repro).
//
// Session-20 F1: the malformed-payload test (below) was the LAST
// XFF-less request in the whole suite — 1 login POST per run into the
// shared "unknown" bucket meant an 11th consecutive run inside the
// 10-min window against a reuseExistingServer instance would 429-flake
// a test that asserts 422 (empirically proven at the API level: 10
// XFF-less POSTs -> 422 x 10, the 11th -> 429). MALFORMED_KEY closes
// it: after this change no request the suite makes — request-level OR
// browser-driven — touches the "unknown" bucket, within or across
// runs, exactly as AGENTS/CLAUDE/SKILL claim.
const NONOBJECT_KEY = `192.0.2.${process.pid}`;
const ENUM_KEY = `192.0.3.${process.pid}`;
const EMAIL_BOUND_KEY = `192.0.4.${process.pid}`;
const APPOINTMENTS_UI_KEY = `192.0.5.${process.pid}`;
const LOGIN_UI_KEY = `192.0.6.${process.pid}`;
const MALFORMED_KEY = `192.0.7.${process.pid}`;

/** Injects the per-run XFF key on every login POST this page makes
 * through the browser (the LoginForm island's fetch) — the request-level
 * tests pass the header explicitly; this closes the same determinism
 * contract for the UI-driven requests. */
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
    await spoofBrowserLoginKey(page);
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
    await spoofBrowserLoginKey(page);
    // Arrange: a public request lands in the scratch DB through the real API.
    // The name is unique per run — db/e2e.db persists between runs (only the
    // schema is re-pushed), and a repeated name would make the dashboard
    // assertions below ambiguous under Playwright's strict mode.
    const callerName = `Dashboard E2E Caller ${Date.now()}`;
    const callerEmail = `dashboard-e2e-${Date.now()}@example.com`;
    // Session-18 F8: an explicit per-run key — this was the XFF-less POST
    // that 429-flaked the second consecutive run (the 6th "unknown"-bucket
    // request against a reused server's 5/10-min limiter window).
    const submit = await page.request.post("/api/appointments", {
      headers: { "X-Forwarded-For": APPOINTMENTS_UI_KEY },
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
    // Session-20 F1: this was the suite's last XFF-less request — it fed
    // the shared "unknown" login-limiter bucket (see the file header).
    const response = await request.post("/api/auth/login", {
      headers: { "X-Forwarded-For": MALFORMED_KEY },
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
    const headers = { "X-Forwarded-For": NONOBJECT_KEY };
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
    // difference. Per-run spoofed XFF key (session-14 F2) keeps the limiter
    // isolated across runs.
    const headers = { "X-Forwarded-For": ENUM_KEY };
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

  test("login rate-limits the 11th attempt from one key (10 / 10 min)", async ({ request }) => {
    // Session-12 T4: the login limiter (10 attempts / 10 min / key, keyed on
    // the LAST X-Forwarded-For token) had no route-level pin — only the
    // appointments limiter (5 / 10 min) was e2e-pinned. The spoofed XFF key
    // is derived per run from the process pid (session-10 F6 pattern;
    // session-16 F2 — structurally unique, no cross-run collision) so a
    // reused reuseExistingServer instance on :3100 can never poison the
    // bucket. The 198.51.100.x range (TEST-NET-2) is disjoint from every
    // other key in this file.
    const headers = { "X-Forwarded-For": `198.51.100.${process.pid}` };
    const payload = {
      email: E2E_ADMIN_EMAIL,
      password: "definitely-not-the-password",
    };

    // Attempts 1..10: the limiter records each and lets them through to the
    // (async-scrypt) credential check — generic 401 every time.
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request.post("/api/auth/login", {
        headers,
        data: payload,
      });
      expect(response.status(), `attempt ${attempt}`).toBe(401);
    }

    // Attempt 11: over the limit — 429 with the documented message.
    const throttled = await request.post("/api/auth/login", {
      headers,
      data: payload,
    });
    expect(throttled.status()).toBe(429);
    const body = await throttled.json();
    expect(body.error).toBe("Too many attempts. Please try again in a few minutes.");
  });

  test("login bounds the email at 254 chars like the appointments route (session-14 F5)", async ({ request }) => {
    // Session-14 F5: the appointments route caps emails at
    // EMAIL_MAX_LENGTH (254, RFC 5321) but the login route only
    // pattern-checked — a 300-char pattern-valid email burned a full
    // scrypt pass on its way to a generic 401 (live-verified). The seam's
    // bound now applies to BOTH consumers of the email contract; the 422
    // fires before any DB/scrypt work — the sender already knows the
    // address they submitted is too long, so no enumeration oracle is
    // created (the malformed-email 422 has always short-circuited the
    // same way).
    const longEmail = `${"b".repeat(288)}@example.com`; // exactly 300 chars, pattern-valid
    const response = await request.post("/api/auth/login", {
      headers: { "X-Forwarded-For": EMAIL_BOUND_KEY },
      data: { email: longEmail, password: "some-valid-length-password" },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.fields?.email).toBe("Email must be 254 characters or fewer.");
  });
});
