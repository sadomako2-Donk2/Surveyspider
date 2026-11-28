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
- Survey share links (`/s/<id>`, `/api/public/<id>`): off until the owner opens them, and closed again with the survey or by the owner. Anyone with the link can answer without an account, once per browser; each response needs ticked consent (time recorded as `consentAt`). Only answers to the survey's own questions are stored, with length limits; 15 responses per hour per connection per survey, 60 per hour per connection overall, at most 5,000 link responses per survey. Link responses are unpaid, don't use the paid panel's places, and only the survey's owner sees their answers. Link pages are never indexed.
- HTTPS certificate (Google Trust Services, via Render/Cloudflare) renews automatically.

## Owner checklist (accounts outside the code)
- Two-step verification on every account that controls the site: Render, GitHub, GoDaddy, the Google account (Search Console, sign-in), Anthropic, Resend.
- GoDaddy: domain lock on, auto-renew on, contact details current.
- Keep ADMIN_CODE long and random (Render generates it); share it with no one; prefer ADMIN_EMAILS.
- Anthropic: set a monthly spending limit.
- Render: check disk snapshots exist; download a copy of the data regularly.
- GitHub repository is public: no secrets are in it (checked 2026-11-25); make it private if the code shouldn't be visible.

## Before collecting real respondent data
1. Register with Ghana's Data Protection Commission and review obligations under the Data Protection Act, 2012 (Act 843), plus GDPR if surveying people in the UK or EU.
2. Publish a privacy notice and terms; add consent records to surveys.
3. Commission an independent security assessment (penetration test) of the deployed site.
4. Set a data retention and deletion policy; turn on encrypted backups of the Render disk.
5. Move to Phase 2 storage with an audit log before handling sensitive data at scale.
