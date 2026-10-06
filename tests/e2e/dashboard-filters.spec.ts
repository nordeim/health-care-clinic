import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

/* The dashboard query layer (session-34, ADR-012): status/specialty
 * filtering + case-insensitive search + the session-guarded CSV export —
 * all through the SAME pure seam the dashboard page uses
 * (src/lib/dashboard-filters.ts, unit-tested).
 *
 * Per-run XFF keys (the session-16/18 scheme): the fourth segment is the
 * Playwright PROCESS PID — structurally unique per run. Third octets are
 * spec-unique: 126 (fixture POSTs/PATCH), 127 (export GETs), 128 (login
 * POSTs) — disjoint from every other spec's documented bases (104, 105,
 * 106, 107, 192.0.5.x, 192.0.6.x) and the capture-script bases
 * (198.51.123-125.x). No request this spec makes touches the shared
 * "unknown" bucket: the browser-driven UI login gets its key injected via
 * page.route, and every API-level call carries its key explicitly.
 */
const FIXTURE_KEY_BASE = `198.51.126.${process.pid}`;
const EXPORT_KEY = `198.51.127.${process.pid}`;
const LOGIN_KEY = `198.51.128.${process.pid}`;

/** Per-TEST fixture key: the appointments POST limiter allows 5 per key
 * per 10 minutes, and this spec POSTs fixtures from several tests — a
 * single shared key would trip the 429 mid-suite. The test-index suffix
 * keeps every run's keys disjoint (pid) AND every test's bucket separate
 * (the limiter keys on the raw XFF token — not an IPv4 syntax check). */
const fixtureKey = (testIndex: number) => `${FIXTURE_KEY_BASE}.${testIndex}`;

/** Injects the per-run login key on the browser-driven login POST (the
 * LoginForm island's fetch) — the session-18 F8 doctrine. Idempotent with
 * the API-level logins that already carry LOGIN_KEY explicitly. */
async function spoofBrowserLoginKey(page: import("@playwright/test").Page) {
  await page.route("**/api/auth/login", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        "X-Forwarded-For": LOGIN_KEY,
      },
    }),
  );
}

/** Signs in through the real login form and lands on the dashboard. */
async function loginViaUi(page: import("@playwright/test").Page) {
  await spoofBrowserLoginKey(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Signs in through the API (shares the cookie with the page context —
 * one login POST per test, all keyed identically). */
async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    headers: { "X-Forwarded-For": LOGIN_KEY },
    data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

test.describe("dashboard query layer (filters + CSV export)", () => {
  test("anonymous export is bounced before any data is read", async ({ request }) => {
    const anonymous = await request.get("/api/appointments/export", {
      headers: { "X-Forwarded-For": EXPORT_KEY },
    });
    expect(anonymous.status()).toBe(401);
  });

  test("the dashboard renders the query bar (derived selects, search, export)", async ({ page }) => {
    await loginViaUi(page);

    const form = page.getByRole("form", { name: "Filter appointment requests" });
    await expect(form).toBeVisible();

    // The selects are DERIVED from content.ts: all three statuses and all
    // eight services are options — never a hand-copied list.
    const statusSelect = page.getByLabel("Status");
    for (const label of ["New", "Confirmed", "Completed"]) {
      await expect(statusSelect.getByRole("option", { name: label })).toHaveCount(1);
    }
    const specialtySelect = page.getByLabel("Specialty");
    for (const title of ["Chronic care", "Pediatric care", "Acute care"]) {
      await expect(specialtySelect.getByRole("option", { name: title, exact: true })).toHaveCount(1);
    }
    await expect(page.getByLabel("Search", { exact: true })).toBeVisible();
    await expect(form.getByRole("button", { name: "Apply" })).toBeVisible();
    // The unfiltered export link carries no query string.
    const exportLink = page.getByRole("link", { name: "Export CSV" });
    await expect(exportLink).toHaveAttribute(
      "href",
      "/api/appointments/export",
    );
  });

  test("status filter scopes the table (New in, Confirmed out)", async ({ page }) => {
    await loginViaApi(page);
    const stamp = `${Date.now()}-${process.pid}`;
    const key = fixtureKey(3);
    const [alpha, beta] = await Promise.all([
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: {
          fullName: `Filters E2E Alpha ${stamp}`,
          phone: "555-0171",
          specialty: "Pediatric care",
          preferredDate: `${new Date().getFullYear() + 1}-03-15`,
        },
      }),
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: {
          fullName: `Filters E2E Beta ${stamp}`,
          phone: "555-0172",
          specialty: "Family care",
          preferredDate: `${new Date().getFullYear() + 1}-03-16`,
        },
      }),
    ]);
    expect(alpha.status()).toBe(201);
    expect(beta.status()).toBe(201);
    const { id } = (await beta.json()) as { id: string };
    // Beta leaves the New state so the status filter has something to hide.
    const patched = await page.request.patch(`/api/appointments/${id}`, {
      headers: { "X-Forwarded-For": key },
      data: { status: "confirmed" },
    });
    expect(patched.status()).toBe(200);

    await page.goto("/dashboard");
    await page.getByLabel("Status").selectOption("new");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/\/dashboard\?status=new/);

    const alphaRow = page.getByRole("row", { name: new RegExp(`Alpha ${stamp}`) });
    await expect(alphaRow).toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(`Beta ${stamp}`) }),
    ).toHaveCount(0);

    // The export link carries the ACTIVE filter.
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      "/api/appointments/export?status=new",
    );
  });

  test("search matches case-insensitively and narrows to the hit", async ({ page }) => {
    await loginViaApi(page);
    const stamp = `${Date.now()}-${process.pid}`;
    const submit = await page.request.post("/api/appointments", {
      headers: { "X-Forwarded-For": fixtureKey(4) },
      data: {
        fullName: `Filters E2E Casefold ${stamp}`,
        phone: "555-0173",
        specialty: "Acute care",
      },
    });
    expect(submit.status()).toBe(201);

    // Uppercase query, mixed-case name — the seam lowercases both sides.
    await page.goto("/dashboard");
    await page.getByLabel("Search", { exact: true }).fill(`FILTERS E2E CASEFOLD ${stamp}`);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(new RegExp(`search=FILTERS\\+E2E\\+CASEFOLD\\+${stamp}`));

    const hit = page.getByRole("row", { name: new RegExp(`Casefold ${stamp}`) });
    await expect(hit).toBeVisible();
    await expect(
      page.getByRole("row", { name: /Filters E2E (Alpha|Beta|Gamma)/ }),
    ).toHaveCount(0);
  });

  test("bogus filter params are dropped — they never hide rows", async ({ page }) => {
    await loginViaApi(page);
    const stamp = `${Date.now()}-${process.pid}`;
    const key = fixtureKey(5);
    const [alpha, beta] = await Promise.all([
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: { fullName: `Filters E2E Alpha ${stamp}`, phone: "555-0174", specialty: "Pediatric care" },
      }),
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: { fullName: `Filters E2E Beta ${stamp}`, phone: "555-0175", specialty: "Family care" },
      }),
    ]);
    expect(alpha.status()).toBe(201);
    expect(beta.status()).toBe(201);

    // Out-of-allowlist status/specialty + an empty search (a GET form's
    // unset controls) — parseDashboardFilters drops all three.
    await page.goto(
      `/dashboard?status=cancelled&specialty=Podiatry&search=&foo=bar`,
    );
    await expect(
      page.getByRole("row", { name: new RegExp(`Alpha ${stamp}`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(`Beta ${stamp}`) }),
    ).toBeVisible();
  });

  test("no-match search renders the empty-filter state with a clear action", async ({ page }) => {
    await loginViaApi(page);
    await page.goto("/dashboard?search=certainly-no-such-visitor");
    await expect(
      page.getByText("No requests match the current filters."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
  });

  test("export respects the active filter and serves RFC 4180 CSV", async ({ page }) => {
    await loginViaApi(page);
    const stamp = `${Date.now()}-${process.pid}`;
    const key = fixtureKey(7);
    const [alpha, beta] = await Promise.all([
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: {
          fullName: `Filters E2E Alpha ${stamp}`,
          phone: "555-0176",
          specialty: "Pediatric care",
          preferredDate: `${new Date().getFullYear() + 1}-03-15`,
        },
      }),
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: { fullName: `Filters E2E Beta ${stamp}`, phone: "555-0177", specialty: "Family care" },
      }),
    ]);
    expect(alpha.status()).toBe(201);
    expect(beta.status()).toBe(201);
    const { id } = (await beta.json()) as { id: string };
    const patched = await page.request.patch(`/api/appointments/${id}`, {
      headers: { "X-Forwarded-For": key },
      data: { status: "confirmed" },
    });
    expect(patched.status()).toBe(200);

    const response = await page.request.get("/api/appointments/export?status=new", {
      headers: { "X-Forwarded-For": EXPORT_KEY },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toMatch(
      /^attachment; filename="appointments-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    const csv = await response.text();
    // Header row (CRLF row separator — RFC 4180).
    expect(csv.startsWith(
      "Requested at,Full name,Phone,Email,Specialty,Preferred date,Status\r\n",
    )).toBe(true);
    // The ACTIVE view: the New fixture is exported, the Confirmed one is not.
    expect(csv).toContain(`Filters E2E Alpha ${stamp}`);
    expect(csv).not.toContain(`Filters E2E Beta ${stamp}`);
  });

  test("export quotes fields containing commas and doubles embedded quotes", async ({ page }) => {
    await loginViaApi(page);
    const stamp = `${Date.now()}-${process.pid}`;
    const submit = await page.request.post("/api/appointments", {
      headers: { "X-Forwarded-For": fixtureKey(8) },
      data: {
        fullName: `Filters, E2E "Gamma" ${stamp}`,
        phone: "555-0178",
        specialty: "Acute care",
      },
    });
    expect(submit.status()).toBe(201);

    const response = await page.request.get("/api/appointments/export", {
      headers: { "X-Forwarded-For": EXPORT_KEY },
    });
    expect(response.status()).toBe(200);
    const csv = await response.text();
    // RFC 4180: the comma forces quoting, the embedded quotes double.
    expect(csv).toContain(`"Filters, E2E ""Gamma"" ${stamp}"`);
  });

  test("export neutralizes spreadsheet-formula payloads (OWASP CSV injection, session-36)", async ({ page }) => {
    await loginViaApi(page);
    // Both payloads are VALID public-form submissions (fullName 3–120 with
    // no charset rule; phone 7–32) — the export is the evaluation boundary.
    // The name needs no per-run stamp: the assertion targets the EXACT
    // guarded field, which is unique in the export by construction.
    const submit = await page.request.post("/api/appointments", {
      headers: { "X-Forwarded-For": fixtureKey(10) },
      data: {
        fullName: '=HYPERLINK("http://evil.example","Click") Injection E2E',
        phone: "+65 6555 9898",
        specialty: "Primary Care",
      },
    });
    expect(submit.status()).toBe(201);

    const response = await page.request.get("/api/appointments/export", {
      headers: { "X-Forwarded-For": EXPORT_KEY },
    });
    expect(response.status()).toBe(200);
    const csv = await response.text();
    // The apostrophe text-marker lands INSIDE the RFC 4180 quoted field —
    // spreadsheet apps display the value verbatim but refuse evaluation.
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""Click"") Injection E2E"`);
    // The +leading international phone gains the same marker.
    expect(csv).toContain("'+65 6555 9898");
    // No cell may START a formula unguarded (field-start forms: after a
    // comma or a doubled closing quote, or at the line start).
    for (const line of csv.split("\r\n").slice(1)) {
      expect(line).not.toMatch(/(^|,)=HYPERLINK/);
    }
  });

  test("duplicate filter keys parse FIRST-wins — the export matches the visible view (session-36, F5)", async ({ page }) => {
    await loginViaApi(page);
    const stamp = `${Date.now()}-${process.pid}`;
    const key = fixtureKey(11);
    const [alpha, beta] = await Promise.all([
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: { fullName: `Dupkey E2E Alpha ${stamp}`, phone: "555-0179", specialty: "Primary Care" },
      }),
      page.request.post("/api/appointments", {
        headers: { "X-Forwarded-For": key },
        data: { fullName: `Dupkey E2E Beta ${stamp}`, phone: "555-0180", specialty: "Family care" },
      }),
    ]);
    expect(alpha.status()).toBe(201);
    expect(beta.status()).toBe(201);
    const { id } = (await beta.json()) as { id: string };
    const patched = await page.request.patch(`/api/appointments/${id}`, {
      headers: { "X-Forwarded-For": key },
      data: { status: "confirmed" },
    });
    expect(patched.status()).toBe(200);

    // A hand-crafted URL repeating an allowlisted key: the dashboard page
    // (Next searchParams → firstValue) shows status=new; the export MUST
    // filter identically (first value), never the Object.fromEntries last.
    const dashboard = await page.goto(
      "/dashboard?status=new&status=confirmed",
    );
    expect(dashboard?.status()).toBe(200);
    await expect(
      page.getByRole("row", { name: new RegExp(`Dupkey E2E Alpha ${stamp}`) }),
    ).toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(`Dupkey E2E Beta ${stamp}`) }),
    ).toHaveCount(0);

    const response = await page.request.get(
      "/api/appointments/export?status=new&status=confirmed",
      { headers: { "X-Forwarded-For": EXPORT_KEY } },
    );
    expect(response.status()).toBe(200);
    const csv = await response.text();
    expect(csv).toContain(`Dupkey E2E Alpha ${stamp}`);
    expect(csv).not.toContain(`Dupkey E2E Beta ${stamp}`);
  });
});
