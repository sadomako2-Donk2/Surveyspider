"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuestionInput } from "@/lib/surveys";
import { DEFAULT_CONSENT, MIN_HOURLY_USD, OPEN_SCREENING } from "@/lib/surveys";
import { AI_OFF, aiPost } from "./aiFetch";

type Draft = { title: string; description: string; minutes: number; questions: QuestionInput[] };

/** "Create with AI": Claude drafts the questions, which open in the builder as an unpublished draft. */
export function AiDraft({ aiOn }: { aiOn: boolean }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    if (goal.trim().length < 8) return setError("Describe what you want to find out in a sentence or two.");
    setBusy(true);
    const r = await aiPost<Draft>("/api/ai/draft-survey", { goal, audience, length: Number(length) });
    if (!r.ok) {
      setBusy(false);
      return setError(r.message);
    }
    const d = r.data;
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: d.title,
        description: d.description,
        consentText: DEFAULT_CONSENT,
        questions: d.questions,
        minutes: d.minutes,
        reward: (Math.ceil(((MIN_HOURLY_USD * 1.25 * d.minutes) / 60) * 20) / 20).toFixed(2),
        target: 100,
        screening: OPEN_SCREENING,
        attentionCheck: true,
      }),
    });
    const saved = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      setBusy(false);
      return setError(saved.message ?? "Couldn't save the draft.");
    }
    router.push(`/surveys/${saved.id}/edit?drafted=${d.questions.length}`);
  }

  return (
    <section className="card">
      <div>
        <span className="eyebrow">Create with AI</span>
        <h2>Describe what you want to learn</h2>
      </div>
      <label>
        Your goal
        <textarea
          rows={3}
          maxLength={800}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Measure how useful our 2-day negotiation course was and what people changed at work afterwards"
        />
      </label>
      <div className="grid2">
        <label>
          Who will answer? (optional)
          <input
            maxLength={160}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. Sales managers who attended the course"
          />
        </label>
        <label>
          Length
          <select value={length} onChange={(e) => setLength(e.target.value)}>
            <option value="6">Short · about 6 questions</option>
            <option value="10">Standard · about 10 questions</option>
            <option value="15">Detailed · about 15 questions</option>
          </select>
        </label>
      </div>
      {error && (
        <p className="errs" role="alert">
          {error}
        </p>
      )}
      <div className="ctas tight">
        <button type="button" className="btn gold" disabled={!aiOn || busy} onClick={run}>
          {busy ? "Writing your survey…" : "Create survey with AI"}
        </button>
        <span className="hint" role="status">
          {!aiOn ? AI_OFF : busy ? "This usually takes 20–40 seconds." : "You can edit every question afterwards."}
        </span>
      </div>
    </section>
  );
}
