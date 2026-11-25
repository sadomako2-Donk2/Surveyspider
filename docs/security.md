# Security and privacy

## In place
- Passwords hashed with scrypt; HttpOnly SameSite=Lax session cookies (30 days); sign-out everywhere on password reset.
- Email verification before launching surveys, taking paid studies, using AI or registering for courses.
- Rate limits on sign-in, reset, verification, AI and enquiries. Same-origin check on all writes.
- Server-side validation and length limits on every field; unknown statuses and currencies rejected; LinkedIn link must be https.
- Administrators don't receive survey answers or participant account ids for surveys they don't own.
- Groups smaller than 3 are suppressed in analysis.
- Secrets only in Render environment variables.
- Security headers on every response: Content-Security-Policy (scripts only from this site), Strict-Transport-Security (https, 1 year), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (no camera, microphone, location), Cross-Origin-Opener-Policy.
- Browser libraries (Excel, Word and PDF readers) are served from `/vendor/` on this site, not from CDNs (`public/vendor/README.md`).
- Rate limits use Cloudflare's CF-Connecting-IP when present; sign-in also has a per-email limit, so changing address doesn't allow more password guesses. Repeated wrong admin codes lock that visitor out for an hour.
- HTTPS certificate (Google Trust Services, via Render/Cloudflare) renews automatically.
- Phase 2 (`apps/web`): the same headers from `src/lib/security-headers.ts` (applied in `next.config.ts`), `clientIp` prefers CF-Connecting-IP, sign-in has the per-email limit, and the Excel, Word and PDF libraries are bundled with the app (no CDNs). `tests/e2e/security.spec.ts` and the import tests fail if the policy blocks anything the site loads.

## Phase 2 additions (step 3)
- Session cookies (`afri_session`): random 256-bit tokens, HttpOnly, SameSite=Lax, Secure over HTTPS, 30 days; only a hash is stored.
- Email confirmation and reset links: one-time, hashed in the database, 48 hours / 60 minutes; the token is removed from the address bar after use; pages send no referrer.
- Password reset signs out every other session. Unknown emails get the same answer as known ones.
- Links in emails use PUBLIC_URL (or Render's own address), never the request's Host header.
- Organisation roles: owners manage everyone; admins manage analysts and members; the last owner can't be removed. Every change is in the append-only audit log (IP addresses hashed).

## Phase 2 additions (AI features)
- Claude is called only from the server, with prompts built there for each feature (draft, question check, file reading, analyst, report). The browser can't send its own instructions or choose which data is used.
- AI needs a signed-in account with a confirmed email and is limited per account (`AI_REQUESTS_PER_HOUR`, default 40), counted in the database.
- The analyst and report use the owner-only `loadAnalysis` query; everyone else, administrators included, gets "not found". Claude receives a text summary (counts, percentages, averages, up to 60 written answers per question); participant codes, account ids, emails and timings are never sent, groups under 3 aren't listed, and a filter can't narrow the data to a group under 3.
- The saved AI report is stored on the survey and shown only to its owner; administrators' survey list doesn't select it.
- Error messages from the AI service are not shown to people. With no `ANTHROPIC_API_KEY`, the AI buttons are switched off and say so.

## Owner checklist (accounts outside the code)
- Two-step verification on every account that controls the site: Render, GitHub, GoDaddy, the Google account (Search Console, sign-in), Anthropic, Resend.
- GoDaddy: domain lock on, auto-renew on, contact details current.
- Keep ADMIN_CODE long and random (Render generates it); share it with no one; prefer ADMIN_EMAILS.
- Anthropic: set a monthly spending limit.
- Render: check disk snapshots exist; download a copy of the data regularly.
- GitHub repository is public: no secrets are in it (checked 2026-11-25); make it private if the code shouldn't be visible.

## Before collecting real respondent data
1. Register with Ghana's Data Protection Commission and review obligations under the Data Protection Act, 2012 (Act 843), plus GDPR if surveying people in the UK or EU.
2. Publish a privacy notice and terms; add consent records to surveys. The notice must say that survey results, including written answers, are sent to Anthropic (Claude) when an owner uses the AI analyst, AI report, question checker or AI file reading, and the data processing terms with Anthropic should be reviewed.
3. Commission an independent security assessment (penetration test) of the deployed site.
4. Set a data retention and deletion policy; turn on encrypted backups of the Render disk.
5. Move to Phase 2 storage with an audit log before handling sensitive data at scale.
