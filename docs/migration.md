# Moving Phase 1 data into Phase 2 (step 9)

`apps/web/scripts/import-phase1.ts` copies Phase 1's `store.json` into the Phase 2 PostgreSQL database.

- **Dry run by default.** It does the whole import inside one database transaction and then rolls it back. The report shows exactly what `--apply` would do, and every database rule is checked.
- **All or nothing.** With `--apply` it's still one transaction: if anything fails, nothing is saved.
- **Safe to repeat.** Records are matched on their Phase 1 id (`legacyId`) and never imported twice. The only existing Phase 2 record it changes is an account with the same email: it is linked, and gets the Phase 1 password only if it has none.
- **Nothing invented.** What can't be carried across is skipped and listed with its Phase 1 id and the reason. The report never contains names, emails or answers.

## What is copied

| Phase 1 | Phase 2 | Notes |
| --- | --- | --- |
| users | User | Passwords keep working (same scrypt format). Google sign-in is kept. Unconfirmed emails stay unconfirmed. Sessions and email links are not copied, so everyone signs in again. |
| profiles | ParticipantProfile | Skipped if the age is missing or under 18. |
| courses, sessions | Course, CourseSession | Fees become minor units (GHS 450 → 45000). A new slug is made from the title. |
| enrollments | Enrollment | Same status. Duplicate active registrations are skipped. |
| studies | Survey + SurveyVersion + Question | See below. Reward, target, minutes, screening, attention check, library headline and the AI report are kept. |
| responses | Response + Answer | Status, test flag, reward, attention check, speed flag, time taken and demographics are kept. Participant codes (P001…) follow submission order, as before. |
| actions | InsightAction | Linked to the question it measures. |
| enquiries | Enquiry | Linked to the sender's account if they had one. |
| fieldwork | FieldworkRequest | Quotes are kept exactly as quoted at the time, not recalculated. |
| settings | SiteSetting `contact` | Not overwritten if contact details were already set on the new site. |

**Surveys.** Phase 1 had no versions, so each survey becomes version 1. A survey that ever went live gets version 1 *published*, holding the Phase 1 answers, with no consent statement (Phase 1 didn't record one, and none is made up). It also gets a published version 2 with the same questions and the standard consent statement, so anyone who answers after the move is asked for consent. Answers to identical questions are analysed together across versions, so the owner sees one set of results. Drafts stay unpublished drafts, with the standard consent statement ready to edit.

**Answers that can't be copied.** Phase 1 let owners edit a live survey. Answers to questions that were later deleted have no question to belong to, so they are left out and counted in the report's warnings. A survey created by a visitor without an account (no owner account) is skipped, along with its responses.

## Test on a copy (do this first)

The copy of `store.json` contains personal data and survey answers. Keep it on an encrypted computer, never commit it to GitHub (`store.json` is in `.gitignore`), never email it, and delete it when you are done.

1. **Get a copy of the file.** In Render, open the Phase 1 service (`surveyspider`). The data is at `/var/data/store.json`. One way to download it is Render's SSH access: add your SSH key under Account Settings → SSH Public Keys, find the service's SSH address under **Connect → SSH**, then on your computer run `scp <ssh-address>:/var/data/store.json ./store.json`. Copying the file doesn't change the live site.
2. **Make a scratch database**, never the real Phase 2 one, e.g. a local PostgreSQL:
   ```bash
   createdb afrimetrica_rehearsal
   ```
   ```bash
   cd apps/web
   ```
   ```bash
   DATABASE_URL=postgresql://localhost/afrimetrica_rehearsal npm run db:deploy
   ```
3. **Dry run**, then read the report:
   ```bash
   DATABASE_URL=postgresql://localhost/afrimetrica_rehearsal npm run db:import-phase1 -- ../store.json
   ```
4. **Apply on the scratch database**, then start the app against it (`DATABASE_URL=... npm run dev`). Sign in with a Phase 1 account, open a survey's Responses and Analyze pages, and check the counts against Phase 1.
   ```bash
   DATABASE_URL=postgresql://localhost/afrimetrica_rehearsal npm run db:import-phase1 -- ../store.json --apply
   ```
5. **Run it again**: every row should say `already`, with nothing imported.
6. Delete the scratch database (`dropdb afrimetrica_rehearsal`) and the copy of `store.json`.

The automated tests do the same on a sample made by the real Phase 1 server (`apps/web/tests/fixtures/phase1-store.json`, rebuilt with `node apps/web/scripts/phase1/make-fixture.mjs` from the repository root; all names in it are made up).

## The real run

This is part of step 10 (cut-over). Stop new writes on Phase 1 first, so nothing is added after the copy is taken. Then copy `store.json` again, dry-run against the Phase 2 database, and apply. Keep the Phase 1 disk as a read-only backup for 90 days. Only do this after the checks in `docs/security.md` are done.
