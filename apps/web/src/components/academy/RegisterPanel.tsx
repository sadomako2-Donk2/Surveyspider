"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";
import type { SessionView } from "@/server/academy/view";

interface Props {
  courseId: string;
  slug: string;
  sessions: (SessionView & { mine: boolean })[];
  interestRegistered: boolean;
  signedIn: boolean;
  needsVerification: boolean;
  certificate: boolean;
}

export function RegisterPanel({
  courseId,
  slug,
  sessions,
  interestRegistered,
  signedIn,
  needsVerification,
  certificate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null); // a session id, or "" for interest
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = open ? sessions.find((s) => s.id === open) : null;
  const signin = `/signin?next=${encodeURIComponent(`/training/${slug}`)}`;

  function start(id: string) {
    setError("");
    setDone("");
    setOpen(id);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") ?? "").trim();
    if (open && !phone) return setError("Add a phone number so we can confirm your place.");
    setBusy(true);
    setError("");
    const r = await postJson("/api/registrations", {
      courseId,
      sessionId: open || undefined,
      phone,
      organisation: f.get("organisation"),
      notes: f.get("notes"),
    });
    setBusy(false);
    if (!r.ok) return setError(r.data.message ?? "That didn't work. Please try again.");
    setOpen(null);
    setDone(
      open
        ? "You're registered. We'll email you to confirm your place."
        : "Thanks. We'll let you know when dates are announced.",
    );
    router.refresh();
  }

  const action = (s: Props["sessions"][number]) => {
    if (s.mine) return <span className="pill live">Registered</span>;
    if (s.past) return <span className="hint">Finished</span>;
    if (s.full) return <span className="hint">Full</span>;
    if (!signedIn)
      return (
        <Link className="btn small primary" href={signin}>
          Sign in to register
        </Link>
      );
    return (
      <button className="btn small primary" type="button" onClick={() => start(s.id)} disabled={needsVerification}>
        Register
      </button>
    );
  };

  return (
    <section className="card" aria-labelledby="dates-h">
      <h2 id="dates-h">Dates and registration</h2>
      {done && (
        <p className="notice" role="status">
          {done}
        </p>
      )}
      {needsVerification && (
        <p className="notice warn">
          Confirm your email address to register. The link is in your inbox; you can resend it from My Account.
        </p>
      )}
      {sessions.length ? (
        <ul className="ses-list">
          {sessions.map((s) => (
            <li key={s.id} className="ses">
              <div>
                <b>{s.dates}</b>
                <span className="hint">{[s.location, s.fee, s.past ? "" : s.seats].filter(Boolean).join(" · ")}</span>
              </div>
              {action(s)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Dates haven&apos;t been announced yet.</p>
      )}
      {interestRegistered ? (
        <span className="pill live">Interest registered</span>
      ) : signedIn ? (
        <button className="btn small" type="button" onClick={() => start("")} disabled={needsVerification}>
          {sessions.length ? "None of these dates work? Register interest" : "Register your interest"}
        </button>
      ) : (
        <Link className="btn small" href={signin}>
          Sign in to register your interest
        </Link>
      )}
      {certificate && <p className="hint">Includes a certificate of completion (not an accredited qualification).</p>}

      {open !== null && (
        <form className="stack reg-form" onSubmit={submit} noValidate>
          <h3>{chosen ? "Register for this date" : "Register your interest"}</h3>
          <p className="hint">
            {chosen
              ? `${chosen.dates}${chosen.location ? ` · ${chosen.location}` : ""} · ${chosen.fee}`
              : "We'll contact you when new dates are announced."}
          </p>
          <label>
            Phone{chosen ? "" : " (optional)"}
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
          <label>
            Organisation (optional)
            <input name="organisation" autoComplete="organization" maxLength={120} />
          </label>
          <label>
            Anything we should know? (optional)
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Accessibility needs, invoicing details, questions…"
            />
          </label>
          {chosen?.paid && (
            <p className="hint">We&apos;ll email payment details to confirm your place. No payment is taken now.</p>
          )}
          {error && (
            <p className="errs" role="alert">
              {error}
            </p>
          )}
          <div className="ctas tight">
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? "Sending…" : chosen ? "Register" : "Register interest"}
            </button>
            <button className="btn ghost" type="button" onClick={() => setOpen(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
