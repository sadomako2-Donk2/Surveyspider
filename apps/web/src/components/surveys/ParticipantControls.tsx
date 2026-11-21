"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { COUNTRIES, GENDERS, OCCUPATIONS, type Profile } from "@/lib/surveys";

export function ProfileForm({ initial }: { initial: Profile | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [refreshing, startRefresh] = useTransition(); // "saved" shows once the survey list has updated
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age: Number(f.get("age")),
        gender: f.get("gender"),
        country: f.get("country"),
        occupation: f.get("occupation"),
      }),
    });
    if (!r.ok)
      return setError(((await r.json().catch(() => ({}))) as { message?: string }).message ?? "Couldn't save.");
    setError("");
    setSaved(true);
    startRefresh(() => router.refresh());
  }
  const select = (name: string, label: string, list: string[], value?: string) => (
    <label>
      {label}
      <select name={name} defaultValue={value ?? ""}>
        <option value="">Choose…</option>
        {list.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  return (
    <form className="card" onSubmit={submit} noValidate>
      <div>
        <h2>Participant profile</h2>
        <p className="muted">
          Researchers use these answers to invite the right people. They see them only alongside your survey answers,
          never with your name or email.
        </p>
      </div>
      <div className="grid4">
        <label>
          Age
          <input name="age" type="number" min={18} max={120} defaultValue={initial?.age} />
        </label>
        {select("gender", "Gender", GENDERS, initial?.gender)}
        {select("country", "Country", COUNTRIES, initial?.country)}
        {select("occupation", "Occupation", OCCUPATIONS, initial?.occupation)}
      </div>
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      {saved && !error && !refreshing && (
        <p className="notice" role="status">
          Profile saved.
        </p>
      )}
      <button className="btn primary" type="submit">
        Save profile
      </button>
    </form>
  );
}

const REVIEW = [
  ["APPROVED", "Approved"],
  ["FLAGGED", "Needs review"],
  ["REJECTED", "Rejected"],
] as const;

export function ReviewSelect({ id, status, label }: { id: string; status: string; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <select
      aria-label={`Review ${label}`}
      value={value}
      onChange={async (e) => {
        const next = e.target.value;
        setValue(next);
        const r = await fetch(`/api/responses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!r.ok) setValue(status);
        else router.refresh();
      }}
    >
      {REVIEW.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function SurveyStatusButtons({ id, status }: { id: string; status: "LIVE" | "CLOSED" | "DRAFT" }) {
  const router = useRouter();
  if (status === "DRAFT") return null;
  return (
    <button
      type="button"
      className="btn small"
      onClick={async () => {
        await fetch(`/api/surveys/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: status === "LIVE" ? "CLOSED" : "LIVE" }),
        });
        router.refresh();
      }}
    >
      {status === "LIVE" ? "Close survey" : "Reopen survey"}
    </button>
  );
}

/** `url` is built on the server, so the page looks the same before and after it loads in the browser. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="copy-link">
      <code>{url}</code>
      <button
        type="button"
        className="btn small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </span>
  );
}

export function DeleteDraft({ id }: { id: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  return sure ? (
    <span className="ctas tight">
      <button
        type="button"
        className="btn small danger"
        onClick={async () => {
          await fetch(`/api/surveys/${id}`, { method: "DELETE" });
          router.refresh();
        }}
      >
        Yes, delete
      </button>
      <button type="button" className="btn small ghost" onClick={() => setSure(false)}>
        Keep
      </button>
    </span>
  ) : (
    <button type="button" className="btn small ghost danger" onClick={() => setSure(true)}>
      Delete draft
    </button>
  );
}
