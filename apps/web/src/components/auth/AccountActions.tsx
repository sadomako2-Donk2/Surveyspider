"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "./api";

export function ResendVerification({ email }: { email: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <span>
      <button
        className="linkbtn"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await postJson<{ already?: boolean }>("/api/auth/resend-verification", {});
          setBusy(false);
          setMsg(
            r.ok
              ? r.data.already
                ? "Your email is already confirmed."
                : `Sent. Check ${email}, including the spam folder.`
              : (r.data.message ?? "Couldn't send the email."),
          );
        }}
      >
        Send the link again
      </button>
      {msg && (
        <span className="hint" role="status">
          {" "}
          {msg}
        </span>
      )}
    </span>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn ghost"
      type="button"
      onClick={async () => {
        await postJson("/api/auth/logout", {});
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
