# Afrimetrica — working notes for Claude

Afrimetrica (Centre for Research Methods and Analytics, operated by Regelco International Ltd, Ghana) runs training (Academy), survey software (Surveys), data analysis (Analytics), consultancy (Consulting) and a Knowledge Hub.

## Current phase
Phase 1 is live: a single Node.js service (`server.mjs`) plus a single-page front end (`public/index.html`), deployed on Render (service name `surveyspider`, auto-deploys from `main`).
Phase 2 is being built in `apps/web` (Next.js App Router, TypeScript strict) on the `phase-2` branch, following `docs/phase-2-prompts.md` one step at a time. Progress is tracked in that file. Never change Phase 1 behaviour while working on Phase 2.

## Rules
- Keep the navy-and-gold design and the existing survey, analysis, auth and Paper Survey features working. Make incremental changes and add tests.
- Never invent data or statistical results. AI output must be grounded in the user's data.
- Administrators must not read other people's survey answers: `/api/data` returns `adminStub` (no answers, hashed participant id) to admins for surveys they don't own.
- Published survey answers are only visible to the survey's owner and the participant who gave them.
- No secrets in the repo. API keys go in Render → Environment only.
- Never claim courses are accredited: certificates are "certificates of completion".
- Do not deploy with real respondent data until the privacy and security checks in `docs/security.md` are done.
- The brand is not legally cleared and `afrimetrica.com` is not confirmed. Don't set `PUBLIC_URL` until a domain actually resolves to Render (it turns on a site-wide redirect).

## Layout
- `public/index.html`: hash-routed SPA. `TOPNAV`, `SURVEY_NAV`, `ROUTES` define navigation. Three storage backends behind `backend.*`: own server (`API`), claude.ai artifact database (`DB`), demo (`localStorage`).
- The statistics library sits between `/*STAT-START*/` and `/*STAT-END*/` and is tested against SciPy (`tests/stats.test.mjs`).
- `server.mjs`: JSON store at `DATA_DIR/store.json`; routes under `/api/*`; auth (email+password, Google), Resend emails, rate limits, same-origin checks.

## Commands
Phase 1 (repository root):
- `npm test` — 20 statistics checks + 124 API checks. Must pass before pushing.
- `npm start` — runs on port 10000.

Phase 2 (`cd apps/web`):
- `npm run dev` — development server on port 3000.
- `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` (Vitest), `npm run build`, `npm run test:e2e` (Playwright; set `PW_CHROMIUM_PATH` to use an existing Chromium).
- Database: copy `.env.example` to `.env`. `npm run db:migrate` (create/apply migrations in development), `npm run db:seed`, `npm run db:studio`, `npm run test:db` (runs in a throwaway database; needs a role with CREATEDB).
- Auth lives in `src/server/auth/` (handlers are plain `Request → Response` functions, tested directly in `tests/db/auth.test.ts`). `npm run test:e2e` builds nothing: run `npm run build` first; it starts the app with a throwaway database and a fake email server.
- Public pages: wording lives in `src/content/`; shared pieces in `src/components/site/`. `npm run test:e2e` runs an axe accessibility check on every public page; keep it at zero serious issues.
- Statistics: `src/lib/stats` is a line-for-line port of Phase 1's STAT. `tests/unit/stats.test.ts` checks it against SciPy (`tests/expected.json` at the repo root) and `tests/unit/stats-parity.test.ts` against the Phase 1 code. Change both copies together, or neither.
- Analysis: `src/lib/analysis` (pure functions; groups under MIN_GROUP = 3 are never shown). Answers reach analysis only through `loadAnalysis`, whose database query includes the owner check; administrators use `adminSurveyTotals` (counts only).
- AI: `src/server/ai/claude.ts` is the only place that calls Claude (model `claude-opus-5-5`, refusal fallback, explicit effort); prompts and checks on Claude's answers are in `src/lib/ai.ts` (ported from Phase 1). Routes: `/api/ai/*` and `/api/surveys/[id]/ai/*` (owner only, via `loadAnalysis`). Tests and `npm run test:e2e` use the fake server in `tests/support/fake-anthropic.ts`; never call the real API in tests.
- Never run `prisma migrate reset` or `db push` against a shared or production database. Production uses `npm run db:deploy` only.
- Rules that Prisma can't express (partial unique index, triggers, CHECKs) live in the SQL of the migration files; add new ones the same way and test them in `tests/db/`.
- CI (`.github/workflows/ci.yml`) runs all of these plus the Phase 1 tests on every push to `main` or `phase-2` and on pull requests.
