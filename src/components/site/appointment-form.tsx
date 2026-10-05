"use client";

import { useState, type FormEvent } from "react";
import { services } from "@/lib/content";

/* ---------------------------------------------------------------------------
 * Appointment request form.
 *
 * Reference behavior, ported: underline-style inputs, a native <select> for
 * the specialty, an optional date, and a submit button that disables and
 * reads "Sending…" while the request is in flight.
 *
 * Completion states (the reference's network layer never resolved inside
 * the headless probe, so the terminal states are designed to match the
 * panel's tone): success swaps the form for a calm confirmation; failure
 * surfaces an actionable message and keeps the entered values.
 * ------------------------------------------------------------------------- */

type Status = "idle" | "sending" | "success" | "error";

const inputClassName =
  "rounded-none border-0 border-b border-primary/40 bg-transparent px-0 py-4 outline-none transition-colors focus:border-primary focus:ring-0";

/* Server 422s carry a per-field map (`{error, fields}`); rendering those
 * messages next to their inputs (with aria-invalid/aria-describedby) is
 * what makes the API's "Please check the highlighted fields." headline
 * literally true. Non-field failures (401/429/500/network) keep the
 * generic alert. Error-state DOM is this repo's own extension surface —
 * the reference has no backend and never renders it. */
type FieldErrors = Partial<Record<"fullName" | "phone" | "email" | "specialty" | "preferredDate", string>>;

function fieldErrorText(errors: FieldErrors | null, key: keyof FieldErrors): string | undefined {
  return errors?.[key];
}

export function AppointmentForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    setErrorMessage(null);
    setFieldErrors(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.get("fullName"),
          phone: data.get("phone"),
          email: data.get("email"),
          specialty: data.get("specialty"),
          preferredDate: data.get("preferredDate"),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; fields?: FieldErrors }
          | null;
        if (response.status === 422 && body?.fields) {
          setFieldErrors(body.fields);
        }
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      // Session-14 F7: a transport-level fetch failure rejects with a
      // TypeError whose message is the raw engine string ("Failed to fetch"
      // in Chromium — engine-specific elsewhere). Curate it like every
      // other message the form shows; every other Error carries an
      // already-curated message (API body or the thrown status line).
      setErrorMessage(
        error instanceof TypeError
          ? "We couldn't reach the clinic server. Please check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Please try again or call us.",
      );
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-8 grid gap-6 text-primary"
      >
        <p className="text-2xl font-medium tracking-[-.03em]">
          Thank you — your request is in.
        </p>
        <p className="section-subtitle leading-relaxed text-muted-foreground">
          Our care team will call you to confirm the visit. If you need care
          sooner, call us at{" "}
          <a
            href="tel:+11234567890"
            className="font-semibold text-foreground"
          >
            123-456-7890
          </a>
          .
        </p>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2"
    >
      <div className="grid content-start">
        <input
          type="text"
          name="fullName"
          required
          aria-label="Full name"
          placeholder="Full name"
          autoComplete="name"
          disabled={sending}
          aria-invalid={fieldErrorText(fieldErrors, "fullName") ? true : undefined}
          aria-describedby={fieldErrorText(fieldErrors, "fullName") ? "fullName-error" : undefined}
          className={inputClassName}
        />
        {fieldErrorText(fieldErrors, "fullName") ? (
          <p id="fullName-error" className="pt-1 text-sm text-destructive">
            {fieldErrors?.fullName}
          </p>
        ) : null}
      </div>
      <div className="grid content-start">
        <input
          type="tel"
          name="phone"
          required
          aria-label="Phone number"
          placeholder="Phone number"
          autoComplete="tel"
          disabled={sending}
          aria-invalid={fieldErrorText(fieldErrors, "phone") ? true : undefined}
          aria-describedby={fieldErrorText(fieldErrors, "phone") ? "phone-error" : undefined}
          className={inputClassName}
        />
        {fieldErrorText(fieldErrors, "phone") ? (
          <p id="phone-error" className="pt-1 text-sm text-destructive">
            {fieldErrors?.phone}
          </p>
        ) : null}
      </div>
      <div className="grid content-start">
        <input
          type="email"
          name="email"
          aria-label="Email (optional)"
          placeholder="Email (optional)"
          autoComplete="email"
          disabled={sending}
          aria-invalid={fieldErrorText(fieldErrors, "email") ? true : undefined}
          aria-describedby={fieldErrorText(fieldErrors, "email") ? "email-error" : undefined}
          className={inputClassName}
        />
        {fieldErrorText(fieldErrors, "email") ? (
          <p id="email-error" className="pt-1 text-sm text-destructive">
            {fieldErrors?.email}
          </p>
        ) : null}
      </div>
      <div className="grid content-start">
        <select
          name="specialty"
          aria-label="Specialty"
          defaultValue="Primary Care"
          disabled={sending}
          aria-invalid={fieldErrorText(fieldErrors, "specialty") ? true : undefined}
          aria-describedby={fieldErrorText(fieldErrors, "specialty") ? "specialty-error" : undefined}
          className={inputClassName}
        >
          <option>Primary Care</option>
          {services.map((service) => (
            <option key={service.title}>{service.title}</option>
          ))}
        </select>
        {fieldErrorText(fieldErrors, "specialty") ? (
          <p id="specialty-error" className="pt-1 text-sm text-destructive">
            {fieldErrors?.specialty}
          </p>
        ) : null}
      </div>
      <div className="grid content-start">
        <input
          type="date"
          name="preferredDate"
          aria-label="Preferred date"
          disabled={sending}
          aria-invalid={fieldErrorText(fieldErrors, "preferredDate") ? true : undefined}
          aria-describedby={fieldErrorText(fieldErrors, "preferredDate") ? "preferredDate-error" : undefined}
          className={inputClassName}
        />
        {fieldErrorText(fieldErrors, "preferredDate") ? (
          <p id="preferredDate-error" className="pt-1 text-sm text-destructive">
            {fieldErrors?.preferredDate}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={sending}
        className="mt-4 rounded-full bg-primary p-4 font-bold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-60 sm:col-span-2"
      >
        {sending ? "Sending…" : "Request my visit"}
      </button>

      {status === "error" && errorMessage ? (
        <p
          role="alert"
          className="text-sm text-destructive sm:col-span-2"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
