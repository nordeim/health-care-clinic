"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/* Logout control — an interactive island on the dashboard page (StatusButton
 * shares it). Clears the session cookie via POST /api/auth/logout, then
 * hard-navigates back to /login (a full reload so the Server Component
 * guard re-runs). */

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      // Session-12 F4: swallow transport failure — the finally still
      // navigates to /login, so an unreachable logout endpoint must not
      // surface as an unhandled promise rejection (console noise, zero
      // user impact: the cookie simply lives until its expiry).
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      router.replace("/login");
      router.refresh();
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={busy}
      className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
