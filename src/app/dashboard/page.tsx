import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HeartPulse, CalendarDays, Phone, Mail, Download } from "lucide-react";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { upcomingVisitsFloor } from "@/lib/validation";
import { appointmentStatuses, services } from "@/lib/content";
import {
  filterAppointments,
  filtersAreEmpty,
  filtersToQueryString,
  parseDashboardFilters,
} from "@/lib/dashboard-filters";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { StatusButton } from "@/components/dashboard/status-button";

/* Staff dashboard — the review surface for the appointment requests captured
 * by the public form. Like /login, this is an intentional extension beyond
 * the reference app and is not linked from the landing page.
 *
 * Guard: the page is a Server Component that verifies the signed session
 * cookie BEFORE any data is read; an invalid/missing session redirects to
 * /login. The heavy validation lives in src/lib/auth.ts (unit-tested);
 * this file only orchestrates. */

export const metadata: Metadata = {
  // BARE title — the root layout's title.template composes the brand
  // suffix exactly once (session-32 F5).
  title: "Appointments",
  description: "Staff dashboard for appointment requests.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/* Badge presentation per workflow state (session-16 G1). The LABELS come
 * from content.ts appointmentStatuses — the value space shared with the
 * API allowlist; unknown values (e.g. a hand-edited DB row) fall back to
 * rendering the raw value, React-escaped. */
const STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-secondary/70 text-primary",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-muted text-muted-foreground",
};

function statusLabel(value: string): string {
  return (
    appointmentStatuses.find((status) => status.value === value)?.label ??
    value
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The query layer (session-34, ADR-012): the SAME pure seam parses,
  // filters, and exports for this page and the CSV route — the two
  // surfaces cannot drift apart. A native GET form drives it: the
  // controls are server-rendered and work without JavaScript.
  const filters = parseDashboardFilters(await searchParams);

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    redirect("/login");
  }

  // The admin row must still exist — deleting the staff account revokes
  // outstanding cookies even before their expiry.
  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { email: true },
  });
  if (!admin) {
    redirect("/login");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Upcoming-visits floor mirrors the validation seam's west-of-server
  // tolerance (server-YESTERDAY — see src/lib/validation.ts): every row
  // the API deems valid belongs in the stat. Before session-12 F6 this
  // counted >= server-TODAY, so tolerated rows vanished from the stat.
  const upcomingFloor = upcomingVisitsFloor(new Date());

  const [total, newToday, upcoming, topSpecialties, appointments] =
    await Promise.all([
      db.appointment.count(),
      db.appointment.count({ where: { createdAt: { gte: startOfToday } } }),
      db.appointment.count({
        where: { preferredDate: { gte: upcomingFloor } },
      }),
      db.appointment.groupBy({
        by: ["specialty"],
        _count: { specialty: true },
        orderBy: { _count: { specialty: "desc" } },
        take: 1,
      }),
      db.appointment.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          specialty: true,
          preferredDate: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const topSpecialty =
    topSpecialties.length > 0 ? topSpecialties[0].specialty : "—";

  // Filters scope the TABLE (within the latest-100 window); the stats
  // cards above stay global — they describe the whole inbox.
  const visibleAppointments = filterAppointments(appointments, filters);
  const filtersActive = !filtersAreEmpty(filters);

  const stats = [
    { label: "Total requests", value: total },
    { label: "New today", value: newToday },
    { label: "Upcoming visits", value: upcoming },
    { label: "Top specialty", value: topSpecialty, isText: true },
  ];

  return (
    <main className="min-h-dvh bg-background px-5 py-8 text-foreground sm:px-8 lg:px-[60px]">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 text-primary">
              <HeartPulse className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">
                Green Grove Family Clinic
              </p>
              <p className="text-xs text-muted-foreground">
                Appointment dashboard · {admin.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-primary/30 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              View site
            </Link>
            <LogoutButton />
          </div>
        </header>

        <h1 className="pb-6 text-3xl font-medium tracking-[-.03em] text-primary">
          Appointment requests
        </h1>

        <div className="grid grid-cols-2 gap-4 pb-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] bg-card p-6 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {stat.isText ? stat.value : stat.value.toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </div>

        <section className="rounded-[24px] bg-card p-6 shadow-sm sm:p-8">
          {appointments.length === 0 ? (
            <div className="grid place-items-center gap-3 py-16 text-center">
              <CalendarDays
                className="h-8 w-8 text-muted-foreground/60"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-primary">
                No appointment requests yet.
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                New requests submitted through the landing-page form appear
                here instantly.
              </p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2">
              {/* The query bar (ADR-012): a native GET form — no client
                 island, no hydration surface. The selects submit ""
                 when unset, which parseDashboardFilters treats as
                 absent; the export anchor carries the ACTIVE filters so
                 the CSV always matches the visible view. */}
              <form
                action="/dashboard"
                method="get"
                className="flex flex-wrap items-end gap-3 pb-6"
                aria-label="Filter appointment requests"
              >
                <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                  <select
                    name="status"
                    defaultValue={filters.status ?? ""}
                    className="min-w-36 rounded-full border border-primary/20 bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                  >
                    <option value="">All statuses</option>
                    {appointmentStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Specialty
                  <select
                    name="specialty"
                    defaultValue={filters.specialty ?? ""}
                    className="min-w-44 rounded-full border border-primary/20 bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground"
                  >
                    <option value="">All specialties</option>
                    {services.map((service) => (
                      <option key={service.title} value={service.title}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Search
                  <input
                    type="search"
                    name="search"
                    defaultValue={filters.search ?? ""}
                    placeholder="Name, phone, or email"
                    className="min-w-56 rounded-full border border-primary/20 bg-background px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground/70"
                  />
                </label>
                <div className="flex items-center gap-2 pb-0.5">
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Apply
                  </button>
                  {filtersActive ? (
                    <Link
                      href="/dashboard"
                      className="rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                      Clear
                    </Link>
                  ) : null}
                  {/* A plain anchor (not next/link): a file download, not
                      an App-Router page. */}
                  <a
                    href={`/api/appointments/export${filtersToQueryString(filters)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export CSV
                  </a>
                </div>
              </form>
              {visibleAppointments.length === 0 ? (
                <div className="grid place-items-center gap-3 py-16 text-center">
                  <CalendarDays
                    className="h-8 w-8 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-primary">
                    No requests match the current filters.
                  </p>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Clear filters
                  </Link>
                </div>
              ) : (
                <>
                  <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-primary/15 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Requested
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Name
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Contact
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Specialty
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Preferred date
                    </th>
                    <th scope="col" className="py-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAppointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-primary/10 last:border-0"
                    >
                      <td className="whitespace-nowrap py-4 pr-4 align-top text-muted-foreground">
                        {DATE_FORMAT.format(appointment.createdAt)}
                        <span className="block text-xs">
                          {TIME_FORMAT.format(appointment.createdAt)}
                        </span>
                      </td>
                      <td className="py-4 pr-4 align-top font-medium text-primary">
                        {appointment.fullName}
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <Phone
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          {appointment.phone}
                        </span>
                        {appointment.email ? (
                          <span className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                            <Mail
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            {appointment.email}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4 align-top text-muted-foreground">
                        {appointment.specialty}
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4 align-top text-muted-foreground">
                        {appointment.preferredDate ?? "—"}
                      </td>
                      <td className="whitespace-nowrap py-4 align-top">
                        {/* role="status" = implicit aria-live="polite"
                            (session-18 F10, WCAG 4.1.3): after the
                            StatusButton's router.refresh() only the mutated
                            badge text announces — rows reconcile in place
                            keyed by appointment id, so exactly one
                            announcement fires per transition. */}
                        <span
                          role="status"
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_BADGE_CLASS[appointment.status] ??
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {statusLabel(appointment.status)}
                        </span>
                        <StatusButton
                          id={appointment.id}
                          status={appointment.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="pt-4 text-xs text-muted-foreground">
                {filtersActive
                  ? `${visibleAppointments.length.toLocaleString("en-US")} of ${appointments.length.toLocaleString("en-US")} requests match the current filters.`
                  : `Showing the ${appointments.length.toLocaleString("en-US")} most recent requests.`}
              </p>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
