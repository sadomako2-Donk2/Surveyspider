"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { postJson } from "./api";

export function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<{ status: "working" | "done" | "failed"; message?: string }>({
    status: token ? "working" : "failed",
    message: token ? undefined : "This confirmation link is incomplete.",
  });
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true; // React may run effects twice in development; the link only works once
    window.history.replaceState(null, "", "/verify-email");
    void postJson<{ email?: string }>("/api/auth/verify", { token }).then((r) =>
      setState(r.ok ? { status: "done", message: r.data.email } : { status: "failed", message: r.data.message }),
    );
  }, [token]);

  return (
    <section className="card auth-card" aria-live="polite">
      {state.status === "working" && <h1>Confirming your email…</h1>}
      {state.status === "done" && (
        <>
          <span className="eyebrow">Email confirmed</span>
          <h1>Thanks! You&apos;re all set.</h1>
          <p className="muted">
            {state.message} is confirmed. You can now register for courses, launch surveys and use the AI features.
          </p>
          <Link className="btn primary" href="/account">
            Go to My Account
          </Link>
        </>
      )}
      {state.status === "failed" && (
        <>
          <h1>That link didn&apos;t work</h1>
          <p className="muted">{state.message ?? "The link may have expired or already been used."}</p>
          <Link className="btn primary" href="/account">
            Sign in to get a new link
          </Link>
        </>
      )}
    </section>
  );
}
