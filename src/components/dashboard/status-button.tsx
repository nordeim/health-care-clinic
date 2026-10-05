"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Status transition button for the dashboard's appointment table
 * (session-16 G1). Renders ONLY the next action in the workflow —
 * new -> [Confirm] -> confirmed -> [Complete] -> completed (terminal,
 * renders nothing). The PATCH seam accepts any allowlisted value (see
 * the route comment), but the UI presents the linear clinic workflow.
 *
 * On success the button triggers router.refresh() so the Server
 * Component re-renders with fresh DB state — the row's badge and next
 * action come from the server, never from local optimistic state. The
 * brief re-enabled window before the refresh lands is benign: a repeat
 * click PATCHes the same (idempotent) status again; the API remains the
 * source of truth. Transport-level failures surface the curated message
 * (session-14 F7 pattern — raw engine strings never reach the UI). */

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  new: { label: "Confirm", next: "confirmed" },
  confirmed: { label: "Complete", next: "completed" },
};

export function StatusButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = NEXT_ACTION[status];
  if (!action) return null;

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.next }),
      });
      if (!response.ok) {
        const body: { error?: string } = await response
          .json()
          .catch(() => null as unknown as { error?: string });
        setError(body?.error ?? `Request failed (${response.status}).`);
        setBusy(false);
        return;
      }
      setBusy(false);
      router.refresh();
    } catch (caught) {
      // TypeError is fetch's network-failure shape — curate it exactly
      // like the public forms do (session-14 F7).
      setError(
        caught instanceof TypeError
          ? "The update didn't reach the server. Please check your connection and try again."
          : "The update failed. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <span className="mt-1.5 grid gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="w-fit rounded-full border border-primary/30 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50"
      >
        {action.label}
      </button>
      {error ? (
        <span role="alert" className="max-w-[16rem] text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
