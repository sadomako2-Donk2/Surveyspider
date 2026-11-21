"use client";

import { useId, useState } from "react";
import { CONFIDENCE, invitations, sampleSize } from "@/lib/sample-size";

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US") : "—");

export function SampleSizeCalculator() {
  const id = useId();
  const [z, setZ] = useState(1.96);
  const [moe, setMoe] = useState("5");
  const [pop, setPop] = useState("");
  const [rr, setRr] = useState("100");
  const e = Number(moe) / 100;
  const n = sampleSize(z, e, Math.max(0, Math.floor(Number(pop) || 0)));
  const rate = Math.min(100, Math.max(1, Number(rr) || 100));
  return (
    <section className="card" aria-labelledby={`${id}-h`}>
      <div>
        <h2 id={`${id}-h`}>Sample size calculator</h2>
        <p className="muted">How many completed responses you need for a given margin of error.</p>
      </div>
      <div className="grid4">
        <label>
          Confidence
          <select value={z} onChange={(ev) => setZ(Number(ev.target.value))}>
            {CONFIDENCE.map((c) => (
              <option key={c.label} value={c.z}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Margin of error (±%)
          <input
            type="number"
            inputMode="decimal"
            min={1}
            max={20}
            step={0.5}
            value={moe}
            onChange={(ev) => setMoe(ev.target.value)}
          />
        </label>
        <label>
          Population (blank = large)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="e.g. 3000"
            value={pop}
            onChange={(ev) => setPop(ev.target.value)}
          />
        </label>
        <label>
          Expected response rate (%)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            value={rr}
            onChange={(ev) => setRr(ev.target.value)}
          />
        </label>
      </div>
      <div className="calc-out" aria-live="polite">
        <div>
          <span className="hint">Completed responses needed</span>
          <b data-testid="needed">{fmt(n)}</b>
        </div>
        <div>
          <span className="hint">People to invite at a {rate}% response rate</span>
          <b data-testid="invite">{fmt(Number.isFinite(n) ? invitations(n, rate / 100) : NaN)}</b>
        </div>
      </div>
      {!Number.isFinite(n) && <p className="hint">Enter a margin of error between 1% and 20%.</p>}
      <p className="hint">
        Assumes a 50/50 split, which gives the largest (safest) number, and simple random sampling.
      </p>
    </section>
  );
}
