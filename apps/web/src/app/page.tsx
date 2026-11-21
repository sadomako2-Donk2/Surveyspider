import { SITE, legalLine } from "@/lib/site";

// Placeholder only. The public pages are rebuilt in step 4 of docs/phase-2-prompts.md.
export default function Home() {
  return (
    <main className="wrap">
      <span className="eyebrow">Phase 2 · in development</span>
      <h1>{SITE.longName}</h1>
      <p className="muted">
        {SITE.tagline}. This is the new application under construction. The live site still runs on Phase 1.
      </p>
      <p className="muted">{legalLine()}</p>
    </main>
  );
}
