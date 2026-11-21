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
| 2026-11 | Own auth code (ported from Phase 1) instead of an auth library | Keeps Phase 1 password hashes and behaviour; small, fully tested surface |
| 2026-11 | Password hashes stored as `scrypt$N$r$p$salt$hash` | Parameters can be raised later; Phase 1 hashes import unchanged, so users keep their passwords |
| 2026-11 | Sessions and email tokens stored as SHA-256 hashes | A database leak doesn't hand out working sessions or links |
| 2026-11 | ADMIN_EMAILS grants admin only after the email is confirmed | Phase 1 granted it at sign-up, so anyone could register the owner's address first |
| 2026-11 | Rate limits kept in the database | Hold across restarts and multiple server processes |
| 2026-11 | Google callback stays at `/auth/google/callback` | No change needed in Google Cloud Console at cut-over |
| 2026-11 | Site administrators = owners/admins of the "afrimetrica" organisation | One role system for staff and client organisations |
| 2026-11 | Public pages are pre-rendered static HTML; only Contact reads the database | Fast, cheap, and the site still shows if the database is down |
| 2026-11 | Until step 6, enquiry buttons open the live Phase 1 form | No dead ends; the `EnquirySlot` component is replaced by real forms in step 6 |
| 2026-11 | Training lists the eight course topics until step 5 | Shows what we teach without inventing dates or fees |
| 2026-11 | Small gold text uses a deeper gold (`--gold-ink` #85601a) | The original gold fails WCAG AA contrast for small text; headings keep the bright gold |
| 2026-11 | System fonts instead of Google Fonts for now | No third-party requests and works offline in CI; Montserrat/Inter can be self-hosted later |
| 2026-11 | Open data links focus on Ghana and Africa (Ghana Statistical Service, DHS, Afrobarometer) | More relevant to Afrimetrica's audience than Data.gov and Statista |
| 2026-11 | Seat limits enforced with a row lock on the course date | Two people booking the last seat at the same moment can't both get it (tested with 6 at once) |
| 2026-11 | Course addresses (`/training/<slug>`) are fixed when a course is created | Renaming a course doesn't break links people have shared |
| 2026-11 | Dates with registrations can't be removed, and seats can't go below the number booked | Prevents silently dropping people's places |
| 2026-11 | Courses with registrations are archived, not deleted | Keeps registration history for invoices and certificates |
| 2026-11 | Unknown currencies are rejected (Phase 1 silently used USD) | Avoids publishing a wrong fee |
| 2026-11 | CSV cells starting with = + - @ are prefixed with ' | Stops spreadsheet formula injection from names or notes typed by the public |
| 2026-11 | People can cancel their own Registered/Interest places; Confirmed and later statuses only by Afrimetrica | A confirmed place may involve payment or invoicing |

