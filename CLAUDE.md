# Afrimetrica — working notes for Claude

Afrimetrica (Centre for Research Methods and Analytics, operated by Regelco International Ltd, Ghana) runs training (Academy), survey software (Surveys), data analysis (Analytics), consultancy (Consulting) and a Knowledge Hub.

## Current phase
Phase 1: a single Node.js service (`server.mjs`) plus a single-page front end (`public/index.html`), deployed on Render (service name `surveyspider`, auto-deploys from `main`). Phase 2 (Next.js, TypeScript, PostgreSQL, Prisma) is planned in `docs/phase-2-prompts.md`. Do not start Phase 2 unless asked.

## Rules
- Keep the navy-and-gold design and the existing survey, analysis, auth and Paper Survey features working. Make incremental changes and add tests.
- Never invent data or statistical results. AI output must be grounded in the user's data.
- Administrators must not read other people's survey answers: `/api/data` returns `adminStub` (no answers, hashed participant id) to admins for surveys they don't own.
- Published survey answers are only visible to the survey's owner and the participant who gave them.
- No secrets in the repo. API keys go in Render → Environment only.
- Never claim courses are accredited: certificates are "certificates of completion".
- Do not deploy with real respondent data until the privacy and security checks in `docs/security.md` are done.
- The brand is not legally cleared. `www.afrimetrica.com` points to the Render service (afrimetrica.com forwards to it), and `PUBLIC_URL` is set to it in `render.yaml`; it turns on a site-wide redirect, so only change it to an address that already reaches Render.

## Layout
- `public/index.html`: hash-routed SPA. `TOPNAV`, `SURVEY_NAV`, `ROUTES` define navigation. Three storage backends behind `backend.*`: own server (`API`), claude.ai artifact database (`DB`), demo (`localStorage`).
- The statistics library sits between `/*STAT-START*/` and `/*STAT-END*/` and is tested against SciPy (`tests/stats.test.mjs`).
- `server.mjs`: JSON store at `DATA_DIR/store.json`; routes under `/api/*`; auth (email+password, Google), Resend emails, rate limits, same-origin checks.

## Commands
- `npm test` — 20 statistics checks + 147 API checks. Must pass before pushing.
- `npm start` — runs on port 10000.
- `npm run pages` (with `npm start` running) — re-lists the public pages in `public/pages.json` for the sitemap and each page's title, description and social preview. Run it after adding or renaming public pages (courses, services, articles).
- Public pages have real addresses (`/training/course/x`); app pages keep `#addresses`. `CLEAN` in `index.html` and `PUBLIC_SECTIONS` in `server.mjs` list the public sections: change both together.
