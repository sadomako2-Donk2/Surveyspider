"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ENQUIRY_STATUS_LABEL, ENQUIRY_STATUSES, type EnquiryStatusCode } from "@/lib/enquiries";
import type { ContactSettings } from "@/server/settings";

export function EnquiryStatusSelect({ id, status, label }: { id: string; status: EnquiryStatusCode; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [msg, setMsg] = useState("");
  return (
    <span className="status-cell">
      <select
        aria-label={`Status for ${label}`}
        value={value}
        onChange={async (e) => {
          const next = e.target.value as EnquiryStatusCode;
          setValue(next);
          setMsg("");
          const r = await fetch(`/api/admin/enquiries/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          });
          if (!r.ok) {
            setValue(status);
            setMsg("Couldn't update.");
          } else router.refresh();
        }}
      >
        {ENQUIRY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ENQUIRY_STATUS_LABEL[s]}
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

export function ContactSettingsForm({ initial }: { initial: ContactSettings }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setSaved(false);
    const r = await fetch("/api/admin/settings/contact", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        Object.fromEntries(
          ["email", "phone", "whatsapp", "address", "hours", "linkedin"].map((k) => [k, String(f.get(k) ?? "")]),
        ),
      ),
    });
    setBusy(false);
    if (!r.ok)
      return setError(((await r.json().catch(() => ({}))) as { message?: string }).message ?? "Couldn't save.");
    setSaved(true);
    router.refresh();
  }
  const input = (name: keyof ContactSettings, label: string, placeholder: string, type = "text") => (
    <label>
      {label}
      <input name={name} type={type} defaultValue={initial[name] ?? ""} placeholder={placeholder} maxLength={300} />
    </label>
  );
  return (
    <form className="card narrow" onSubmit={submit} noValidate>
      <div>
        <h2>Contact details</h2>
        <p className="muted">Shown on the Contact page. Leave a field blank to hide it.</p>
      </div>
      <div className="grid2">
        {input("email", "Public email", "info@yourdomain.com", "email")}
        {input("phone", "Phone", "+233 …", "tel")}
        {input("whatsapp", "WhatsApp number", "+233 …", "tel")}
        {input("hours", "Office hours", "Mon–Fri, 9:00–17:00 GMT")}
      </div>
      <label>
        Office address
        <textarea name="address" rows={3} maxLength={400} defaultValue={initial.address ?? ""} />
      </label>
      {input("linkedin", "LinkedIn page", "https://www.linkedin.com/company/…", "url")}
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          Contact details saved.
        </p>
      )}
      <div className="ctas tight">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save contact details"}
        </button>
        <a className="btn ghost" href="/contact" target="_blank" rel="noopener">
          View the Contact page
        </a>
      </div>
    </form>
  );
}

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", ANALYST: "Analyst", MEMBER: "Member" } as const;
type Role = keyof typeof ROLE_LABEL;
interface Member {
  id: string;
  email: string;
  name: string;
  role: Role;
  userId: string;
}

export function TeamManager({ members, me, myRole }: { members: Member[]; me: string; myRole: Role }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const base = "/api/organisations/afrimetrica/members";
  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      setError(((await r.json().catch(() => ({}))) as { message?: string }).message ?? "That didn't work.");
      return false;
    }
    router.refresh();
    return true;
  }
  const roles: Role[] = myRole === "OWNER" ? ["OWNER", "ADMIN", "ANALYST", "MEMBER"] : ["ANALYST", "MEMBER"];
  return (
    <section className="card">
      <div>
        <h2>Afrimetrica team</h2>
        <p className="muted">
          Owners and admins can use this admin area. Owners can add and change other owners and admins; admins can add
          analysts and members.
        </p>
      </div>
      <div className="table-wrap">
        <table className="wide stack-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td data-label="Person">
                  <b>{m.name || m.email}</b>
                  {m.userId === me && <span className="hint"> (you)</span>}
                  <br />
                  <span className="hint">{m.email}</span>
                </td>
                <td data-label="Role">
                  <select
                    aria-label={`Role for ${m.email}`}
                    defaultValue={m.role}
                    disabled={busy}
                    onChange={(e) => call(`${base}/${m.id}`, "PATCH", { role: e.target.value })}
                  >
                    {(["OWNER", "ADMIN", "ANALYST", "MEMBER"] as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn small ghost danger"
                    type="button"
                    disabled={busy}
                    onClick={() => call(`${base}/${m.id}`, "DELETE")}
                  >
                    {m.userId === me ? "Leave" : "Remove"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="ctas tight add-member"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const form = e.currentTarget;
          if (await call(base, "POST", { email: f.get("email"), role: f.get("role") })) form.reset();
        }}
      >
        <label>
          Add someone by email
          <input name="email" type="email" placeholder="They must have an Afrimetrica account" required />
        </label>
        <label>
          Role
          <select name="role" defaultValue="ANALYST">
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" type="submit" disabled={busy}>
          Add
        </button>
      </form>
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      <p className="hint">
        Analysts and members can&apos;t open the admin area yet; their tools arrive with the survey features.
      </p>
    </section>
  );
}
