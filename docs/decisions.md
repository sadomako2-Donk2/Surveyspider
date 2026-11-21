# Decisions

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11 | Rebrand SurveySpider to Afrimetrica now; rebuild later (Phase 2) | Get the institutional site live without breaking working survey tools |
| 2026-11 | Keep the same GitHub repo and Render service (`surveyspider`) | No new deploy setup; existing data and environment kept |
| 2026-11 | Keep navy and gold | Continuity with the existing design and the Regelco palette |
| 2026-11 | Admins see survey totals, not answers | Blueprint rule: administrators should not automatically read confidential answers |
| 2026-11 | Course registration needs a confirmed account; enquiries don't | Registrations create obligations (seats, invoices); enquiries should be frictionless |
| 2026-11 | No online payments in Phase 1 | Fees invoiced manually until Subscription/Payment is built |
| 2026-11 | "Certificate of completion" wording only | No accreditation is in place |
| 2026-11 | Don't set PUBLIC_URL yet | No working custom domain; the redirect would break the site |
| 2026-11 | Phase 2 lives in `apps/web`, not an npm workspace | Render's Phase 1 build (`npm ci` at the root) stays exactly as it is |
| 2026-11 | TypeScript 5.9, not 7.0 | Next.js's build uses the TypeScript 5 compiler API; revisit when Next supports 7 |
| 2026-11 | Phase 2 work on the `phase-2` branch | `main` auto-deploys the live site |
| 2026-11 | One `Enquiry` table with a `type`, instead of separate ConsultancyEnquiry and AnalyticsEnquiry tables | Same fields and one admin inbox; Phase 1 already works this way; types can still be filtered |
| 2026-11 | Extra tables beyond the blueprint: ParticipantProfile, InsightAction, FieldworkRequest, SiteSetting | Phase 1 stores this data; nothing may be lost in the step-9 migration |
| 2026-11 | Survey immutability and audit append-only enforced with database triggers | Holds even if app code has a bug or someone edits the database directly |
| 2026-11 | Prisma 7.10.1 (stable), not 8.0 release candidate | Avoid pre-release software in production |
| 2026-11 | `effect` pinned to 3.22.5 via npm overrides | Fixes a high-severity advisory in a Prisma CLI dependency without downgrading Prisma |
| 2026-11 | Database tests run in a fresh throwaway database per run | Never wipes an existing database; Prisma also blocks AI agents from `migrate reset` |
| 2026-11 | The seed creates only the Afrimetrica organisation (and an owner if `SEED_OWNER_EMAIL` is set) | No invented courses, people or data; course templates live in `src/content/` for step 5 |

