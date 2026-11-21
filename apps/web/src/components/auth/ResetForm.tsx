"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { postJson } from "./api";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Keep the one-time token out of the address bar, history and screenshots.
  useEffect(() => window.history.replaceState(null, "", "/reset-password"), []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? ""),
      again = String(f.get("again") ?? "");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (password !== again) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const r = await postJson("/api/auth/reset", { token, password });
    setBusy(false);
    if (!r.ok) return setError(r.data.message ?? "That didn't work. Please try again.");
    router.push("/account?password=updated");
    router.refresh();
  }

  if (!token)
    return (
      <section className="card auth-card">
        <h1>This link is incomplete</h1>
        <p className="muted">Open the link from your email again, or ask for a new one.</p>
        <Link className="btn primary" href="/forgot-password">
          Ask for a new link
        </Link>
      </section>
    );
  return (
    <section className="card auth-card">
      <span className="eyebrow">New password</span>
      <h1>Choose a new password</h1>
      <p className="muted">After you save it, you&apos;ll be signed in here and signed out on every other device.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <label>
          New password
          <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required />
        </label>
        <label>
          Type it again
          <input name="again" type="password" autoComplete="new-password" minLength={8} maxLength={200} required />
        </label>
        <p className="hint">At least 8 characters.</p>
        {error && (
          <p className="errs" role="alert">
            {error} {/expired|used/.test(error) && <Link href="/forgot-password">Ask for a new link</Link>}
          </p>
        )}
        <button className="btn primary big" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </section>
  );
}
