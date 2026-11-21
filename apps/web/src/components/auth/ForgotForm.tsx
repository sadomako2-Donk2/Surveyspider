"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { postJson } from "./api";

export function ForgotForm() {
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setBusy(true);
    setError("");
    const r = await postJson("/api/auth/forgot", { email });
    setBusy(false);
    if (!r.ok) return setError(r.data.message ?? "That didn't work. Please try again.");
    setSentTo(email);
  }

  if (sentTo)
    return (
      <section className="card auth-card">
        <span className="eyebrow">Check your email</span>
        <h1>We&apos;ve sent you a link</h1>
        <p className="muted">
          If there&apos;s an Afrimetrica account for <b>{sentTo}</b>, an email with a reset link is on its way. The link
          works for 60 minutes and can be used once.
        </p>
        <p className="hint">Nothing after a few minutes? Check your spam or junk folder.</p>
        <Link className="btn" href="/signin">
          Back to sign in
        </Link>
      </section>
    );
  return (
    <section className="card auth-card">
      <span className="eyebrow">Forgot password</span>
      <h1>Reset your password</h1>
      <p className="muted">
        Enter the email address for your account and we&apos;ll send you a link to choose a new password.
      </p>
      <form className="stack" onSubmit={submit} noValidate>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" maxLength={160} required />
        </label>
        {error && (
          <p className="errs" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary big" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="hint">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </section>
  );
}
