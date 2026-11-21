"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const LABEL = { NEW: "New", CONTACTED: "Contacted", QUOTED: "Final quote sent", WON: "Won", LOST: "Lost" } as const;

export function FieldworkStatus({ id, status, label }: { id: string; status: keyof typeof LABEL; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <select
      aria-label={`Status for ${label}`}
      value={value}
      onChange={async (e) => {
        const next = e.target.value as keyof typeof LABEL;
        setValue(next);
        const r = await fetch(`/api/admin/fieldwork/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!r.ok) setValue(status);
        else router.refresh();
      }}
    >
      {Object.entries(LABEL).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
