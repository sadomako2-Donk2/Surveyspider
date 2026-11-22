"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { postJson } from "@/components/auth/api";
import { ASKS_BUDGET, BUDGETS, SERVICES, TIMELINES, type EnquiryTypeCode } from "@/lib/enquiries";

interface Props {
  type: EnquiryTypeCode;
  title: string;
  intro?: string;
  serviceLabel?: string;
  messageLabel?: string;
  placeholder?: string;
  /** Text already in the message box, e.g. the course and venue the person was looking at. */
  defaultMessage?: string;
}

export function EnquiryForm({
  type,
  title,
  intro,
  serviceLabel = "What do you need?",
  messageLabel = "Tell us about your project",
  placeholder,
  defaultMessage,
}: Props) {
  const id = useId();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const services = SERVICES[type];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const problems = [
      !v("name") && "Enter your name.",
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email")) && "Enter a valid email address.",
      v("message").length < 5 && "Tell us a little about what you need.",
      !f.get("consent") && "Tick the box so we can contact you.",
    ].filter(Boolean);
    if (problems.length) return setError(problems.join(" "));
    setBusy(true);
    setError("");
    const r = await postJson("/api/enquiries", {
      type,
      name: v("name"),
      email: v("email"),
      phone: v("phone"),
      organisation: v("organisation"),
      service: v("service"),
      timeline: v("timeline"),
      budget: v("budget"),
      subject: v("subject"),
      message: v("message"),
      consent: !!f.get("consent"),
      website: v("website"),
    });
    setBusy(false);
    if (!r.ok) return setError(r.data.message ?? "Your message couldn't be sent. Please try again.");
    setSent(true);
  }

  if (sent)
    return (
      <section className="card enquiry-done" role="status">
        <span className="eyebrow">Message sent</span>
        <h2>Thank you. We&apos;ll be in touch.</h2>
        <p className="muted">
          We aim to reply within two working days. If you have an account with this email address, you can follow the
          enquiry in My Account.
        </p>
        <button className="btn" type="button" onClick={() => setSent(false)}>
          Send another message
        </button>
      </section>
    );

  const field = (name: string) => `${id}-${name}`;
  return (
    <form
      className="card enquiry"
      onSubmit={submit}
      onChange={() => error && setError("")}
      noValidate
      aria-labelledby={field("h")}
    >
      <div>
        <h2 id={field("h")}>{title}</h2>
        {intro && <p className="muted">{intro}</p>}
      </div>
      <div className="grid2">
        <label>
          Your name
          <input name="name" autoComplete="name" maxLength={80} required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" maxLength={160} required />
        </label>
        <label>
          Phone (optional)
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </label>
        <label>
          Organisation (optional)
          <input name="organisation" autoComplete="organization" maxLength={120} />
        </label>
        {services.length > 0 && (
          <label>
            {serviceLabel}
            <select name="service" defaultValue="">
              <option value="">Choose…</option>
              {services.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {ASKS_BUDGET[type] && (
          <>
            <label>
              Timeline
              <select name="timeline" defaultValue="">
                <option value="">Choose…</option>
                {TIMELINES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Approximate budget
              <select name="budget" defaultValue="">
                <option value="">Choose…</option>
                {BUDGETS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      {type === "CONTACT" && (
        <label>
          Subject
          <input name="subject" maxLength={160} />
        </label>
      )}
      <label>
        {messageLabel}
        <textarea
          name="message"
          rows={5}
          maxLength={4000}
          placeholder={placeholder}
          defaultValue={defaultMessage}
          required
        />
      </label>
      {/* Hidden from people; bots fill it in. */}
      <div className="hp" aria-hidden="true">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="inline">
        <input type="checkbox" name="consent" />
        You can contact me about this enquiry.
      </label>
      <p className="hint">
        How we use your details: see our <Link href="/privacy">privacy notice</Link>.
      </p>
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
