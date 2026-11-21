"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ENROLLMENT_LABEL, ENROLLMENT_STATUSES, type EnrollmentStatusCode } from "@/lib/academy";

async function patch(id: string, status: EnrollmentStatusCode) {
  const r = await fetch(`/api/registrations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return { ok: r.ok, message: ((await r.json().catch(() => ({}))) as { message?: string }).message };
}

export function CancelRegistration({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  if (!confirming)
    return (
      <button className="btn small ghost danger" type="button" onClick={() => setConfirming(true)}>
        Cancel
      </button>
    );
  return (
    <span className="ctas tight">
      <button
        className="btn small danger"
        type="button"
        onClick={async () => {
          const r = await patch(id, "CANCELLED");
          if (!r.ok) return setError(r.message ?? "Couldn't cancel.");
          router.refresh();
        }}
      >
        Yes, cancel it
      </button>
      <button className="btn small ghost" type="button" onClick={() => setConfirming(false)}>
        Keep
      </button>
      {error && <span className="hint">{error}</span>}
    </span>
  );
}

export function StatusSelect({ id, status, label }: { id: string; status: EnrollmentStatusCode; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [msg, setMsg] = useState("");
  return (
    <span className="status-cell">
      <select
        aria-label={`Status for ${label}`}
        value={value}
        onChange={async (e) => {
          const next = e.target.value as EnrollmentStatusCode;
          setValue(next);
          setMsg("");
          const r = await patch(id, next);
          if (!r.ok) {
            setValue(status);
            setMsg(r.message ?? "Couldn't update.");
          } else router.refresh();
        }}
      >
        {ENROLLMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ENROLLMENT_LABEL[s]}
          </option>
        ))}
      </select>
      {msg && (
        <span className="hint" role="alert">
          {msg}
        </span>
      )}
    </span>
  );
}
