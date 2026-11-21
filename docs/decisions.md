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
| 2026-11 | No automatic "we received your enquiry" email to the sender | Public forms with receipts can be used to send unwanted email to any address; senders see a confirmation on screen instead |
| 2026-11 | Spam protection: hidden "honeypot" field plus 10 enquiries per connection per hour | Stops simple bots without a CAPTCHA that would hurt real visitors |
| 2026-11 | Enquiries join an account only when the email matches and is confirmed | Nobody can read someone else's enquiries by signing up with their address |
| 2026-11 | Service, timeline and budget must be one of the offered choices | Keeps the inbox and CSV clean and filterable |
| 2026-11 | LinkedIn link must be an https link on linkedin.com | Prevents the Contact page linking to an unsafe site |
| 2026-11 | Paper Survey (fieldwork) requests move with the survey tools in step 7 | They belong to the survey quote flow, not general enquiries |
| 2026-11 | Editing a published survey creates the next draft version; responses keep pointing at the version answered | Blueprint: published survey versions are immutable |
| 2026-11 | Every survey needs a consent statement to publish; each response stores the exact wording agreed to | Research ethics and data protection |
| 2026-11 | Answers and the attention check are validated on the server | Phase 1 trusted the browser's attention-check result |
| 2026-11 | Completion time comes from the browser | Faking a longer time gains nothing that waiting wouldn't; faking a shorter one only gets a response flagged |
| 2026-11 | Screening applies only when a survey sets it; open surveys can be answered without a participant profile | Lets surveys be shared by link (e.g. course evaluations) as well as through the panel |
| 2026-11 | Reward, time, audience and attention check lock once someone has answered; the target can still rise | Keeps pay and eligibility fair for everyone who answers |
| 2026-11 | Owners see participants as P001, P002… per survey, never their account or email | Data minimisation; administrators can't see answers at all |
| 2026-11 | Survey links are `/s/<survey>`; taking a survey needs a free account with a confirmed email | One response per person, consent tied to a person, and rewards need an account; names and emails are never shown to researchers |
| 2026-11 | "Saved" messages appear only after the page has refreshed with the new data | Avoids showing success while lists on the page are still out of date |
| 2026-11 | Uploaded questionnaires are read in the browser and never sent to the server | Privacy; only the questions the person chooses to keep are saved |
| 2026-11 | The upload page creates a draft survey straight away and opens it in the builder | Nothing is lost if the page reloads; no hidden browser storage |
| 2026-11 | `uuid` pinned to 11.1.1 via npm overrides | Clears a moderate advisory in an ExcelJS dependency |
| 2026-11 | The pdf.js worker is copied into `public/` on install (not committed) | pdf.js reads PDFs in a separate worker that the site must serve; it stays in step with the installed version |
| 2026-11 | AI features (drafting, question checker, AI file reading) and Paper Survey quotes are not yet in Phase 2 | Step 7 covers the survey core; they move with the Analyze rebuild (step 8) or as their own step |
| 2026-11 | The statistics library lives in `apps/web/src/lib/stats` with a parity test against Phase 1 | Turbopack builds only files inside `apps/web`; the parity test proves the port changed no maths |
| 2026-11 | Owner-only access to answers is part of the analysis database query, not a check after loading | Blueprint: administrators can't automatically read answers; a bug elsewhere can't leak them |
| 2026-11 | Across versions, answers count together only for questions that are identical in wording, type, options and scale | Changed questions aren't mixed with old answers; nothing is guessed |
| 2026-11 | Groups under 3 people are left out of every breakdown, comparison and test and only counted as "hidden" | Same rule as Phase 1; protects participants' anonymity |
| 2026-11 | Analyze charts use one validated hue per mode (#3d5fa8 light, #a98428 dark) with values as text | Passes the dataviz palette checks (lightness band, chroma, contrast); single-series bars need no legend |
| 2026-11 | Status labels use darker/lighter text shades (`--good-ink`, `--warn-ink`) | Phase 1's green and orange labels fall below 4.5:1 for small text |
| 2026-11 | Creating the Afrimetrica organisation and admin membership tolerates simultaneous requests | Found by tests: two admins confirming at once caused a database error |
| 2026-11 | AI analyst, AI reports, hidden patterns and action tracking from Phase 1 are not yet in Phase 2 | Step 8 covers the statistics and Analyze core; these can follow as their own step |
| 2026-11 | Email confirmation counts only failed attempts per connection (30 an hour) | Found by tests: a training room or office sharing one internet address would block each other after 30 confirmations; links can't be guessed anyway |
| 2026-11 | Paper Survey requests are priced again on the server from the project details | Phase 1 stored the total sent by the browser, which could be altered |
| 2026-11 | Paper Survey quotes need no account | Same as Phase 1; quotes are a sales tool; requests join an account once the email is confirmed |
| 2026-11 | AI prompts are built on the server, one route per feature, instead of Phase 1's general "send any prompt" endpoint | The browser can't use the site's AI key for anything else, and the server decides exactly which survey data Claude sees |
| 2026-11 | AI analysis gets a text summary built from the owner-only analysis query, not raw responses | Same rules as the Analyze page: no participant codes or ids, groups under 3 not listed, filters can't single anyone out |
| 2026-11 | The latest AI report is saved on the survey (`Survey.aiReport`) | Same as Phase 1, so step 9 can carry existing reports across |
| 2026-11 | Tests use a fake Claude server (`tests/support/fake-anthropic.ts`) through `ANTHROPIC_BASE_URL` | The real SDK code (fallback retry, error handling) is tested with no network calls or spend |
