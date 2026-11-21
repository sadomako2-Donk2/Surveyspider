# Architecture (Phase 1)

```
Browser ── public/index.html (SPA, hash routes)
   │  fetch /api/*  (cookie session or anonymous X-Client-Token)
   ▼
server.mjs (Node 20+, no framework)
   ├─ JSON store  DATA_DIR/store.json  (Render persistent disk /var/data)
   ├─ Anthropic API (AI features, server-side key)
   ├─ Resend (verification, reset and owner notification emails)
   └─ Google OAuth (optional sign-in)
```

- One process, one file store, written atomically on each change. Suitable for low volume only.
- The same front end also runs as a claude.ai artifact (database capability) and in demo mode (browser storage). `backend.*` hides the differences.
- Render Blueprint `render.yaml`: Starter plan with a 1 GB disk. Health check `/healthz`.

## Limits that Phase 2 removes
- Single JSON file: no concurrent writers, no queries, whole file rewritten on save.
- No immutable survey versions: editing a live survey changes it in place.
- No audit log, no payments, no organisations or memberships.
