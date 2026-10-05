"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { HeartPulse } from "lucide-react";

/* Staff sign-in form. Styling follows the site's own design system (DM Sans,
 * cream background, clinic green, underline inputs — the same language as
 * the appointment form) so the admin surface feels native to the site.
 *
 * States mirror the appointment form's doctrine: disable + "Signing in…"
 * while the request is in flight; failure surfaces the API's message and
 * keeps the entered email; success lets the API set the cookie and then
 * routes to /dashboard. */

type Status = "idle" | "sending" | "error";

type FieldErrors = Partial<Record<"email" | "password", string>>;

const inputClassName =
  "rounded-none border-0 border-b border-primary/40 bg-transparent px-0 py-4 outline-none transition-colors focus:border-primary focus:ring-0";

export function LoginForm() {
  const router = useRouter();
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; fields?: FieldErrors }
          | null;
        if (response.status === 422 && body?.fields) {
          setFieldErrors(body.fields);
        }
        throw new Error(body?.error ?? `Sign-in failed (${response.status}).`);
      }

      // The cookie is set by the API response; navigate after it lands.
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setStatus("error");
      // Session-14 F7: a transport-level fetch failure rejects with a
      // TypeError whose message is the raw engine string ("Failed to fetch"
      // in Chromium — engine-specific elsewhere). Curate it like every
      // other message the form shows; every other Error carries an
      // already-curated message (API body or the thrown status line).
      setErrorMessage(
        error instanceof TypeError
          ? "We couldn't reach the sign-in server. Please check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      );
    }
  }

  const disabled = status === "sending";

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 text-primary">
          <HeartPulse className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-medium tracking-[-.03em] text-primary">
            Green Grove Family Clinic
          </h1>
          <p className="section-subtitle mt-2 text-muted-foreground">
            Staff sign in to review appointment requests.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-6 rounded-[24px] bg-card p-8 shadow-sm"
      >
        <label className="grid gap-2 text-sm font-medium text-primary">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-invalid={fieldErrors?.email ? true : undefined}
            aria-describedby={fieldErrors?.email ? "login-email-error" : undefined}
            className={inputClassName}
          />
          {fieldErrors?.email ? (
            <span id="login-email-error" className="text-sm font-normal text-destructive">
              {fieldErrors.email}
            </span>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-primary">
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            aria-invalid={fieldErrors?.password ? true : undefined}
            aria-describedby={fieldErrors?.password ? "login-password-error" : undefined}
            className={inputClassName}
          />
          {fieldErrors?.password ? (
            <span id="login-password-error" className="text-sm font-normal text-destructive">
              {fieldErrors.password}
            </span>
          ) : null}
        </label>

        {status === "error" && errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={disabled}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {disabled ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Staff access only. For an appointment, use the{" "}
        <Link href="/#contact" className="underline underline-offset-2">
          request form
        </Link>{" "}
        or call 123-456-7890.
      </p>
    </div>
  );
}
