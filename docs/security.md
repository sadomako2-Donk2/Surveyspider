# Security and privacy

## In place
- Passwords hashed with scrypt; HttpOnly SameSite=Lax session cookies (30 days); sign-out everywhere on password reset.
- Email verification before launching surveys, taking paid studies, using AI or registering for courses.
- Rate limits on sign-in, reset, verification, AI and enquiries. Same-origin check on all writes.
- Server-side validation and length limits on every field; unknown statuses and currencies rejected; LinkedIn link must be https.
- Administrators don't receive survey answers or participant account ids for surveys they don't own.
- Groups smaller than 3 are suppressed in analysis.
- Secrets only in Render environment variables.

## Before collecting real respondent data
1. Register with Ghana's Data Protection Commission and review obligations under the Data Protection Act, 2012 (Act 843), plus GDPR if surveying people in the UK or EU.
2. Publish a privacy notice and terms; add consent records to surveys.
3. Commission an independent security assessment (penetration test) of the deployed site.
4. Set a data retention and deletion policy; turn on encrypted backups of the Render disk.
5. Move to Phase 2 storage with an audit log before handling sensitive data at scale.
