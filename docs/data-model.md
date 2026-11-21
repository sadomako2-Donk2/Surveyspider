# Data model

## Phase 1 (store.json collections)
| Collection | Key fields | Who can read |
| --- | --- | --- |
| users | id, email, name, passHash, google, verified | server only |
| sessions, resets, verifies | token hash → user, expiry | server only |
| studies | id, ownerId, title, status (draft/live/closed), questions, screen, reward, target, library | owner; non-drafts listed publicly |
| responses | id, studyId, participantId, ownerId, answers, status, reward | survey owner and participant; admins get a stub with no answers |
| actions | id, studyId, ownerId, title, status, kpi | owner, admins |
| profiles | uid → age, gender, country, occupation | the person |
| fieldwork | id, requesterId, contact, inputs, quote, status | requester, admins |
| courses | id, title, status, level, format, duration, summary, description, outcomes[], audience, certificate, sessions[{id,start,end,location,seats,fee,currency}] | published: everyone; drafts: admins |
| enrollments | id, userId, courseId, sessionId, status, name, email, phone, organisation, notes | the person, admins |
| enquiries | id, type, requesterId, contact, subject, message, details, status | sender, admins |
| settings | email, phone, whatsapp, address, hours, linkedin | everyone (admins write) |

## Phase 2 (PostgreSQL via Prisma) — built in step 2
Source of truth: `apps/web/prisma/schema.prisma` and `apps/web/prisma/migrations/`.

| Area | Tables |
| --- | --- |
| People | User, Organisation, Membership (OWNER, ADMIN, ANALYST, MEMBER), ParticipantProfile |
| Academy | Course (DRAFT, PUBLISHED, ARCHIVED), CourseSession (seats, fee in minor units, USD/GHS/GBP/EUR), Enrollment |
| Surveys | Survey, SurveyVersion, Question (SINGLE, MULTI, RATING, LIKERT, TEXT, NUMBER), ConsentRecord, Response, Answer, InsightAction |
| Enquiries and operations | Enquiry (ANALYTICS, CONSULTANCY, TRAINING, CONTACT), FieldworkRequest, SiteSetting, AuditEvent |
| Later (not built) | Subscription, Payment |

### Rules enforced by the database (not just the app)
- Emails stored lower-case; one account per email.
- One active registration per person, course and date (cancelled ones don't count; "interest without a date" counts as one date). A registration's date must belong to its course.
- No negative seats, fees, rewards or targets; course end dates on or after start dates; participant age 18–120.
- **A published SurveyVersion and its questions can't be changed or deleted.** To change a live survey, create the next version. Surveys that ever went live can't be deleted.
- Responses must use a published version of the same survey; each answer must be to a question in that version; one response per person per survey; one answer per question.
- AuditEvent is append-only (no update, delete or truncate). `actorId` isn't a foreign key so the log outlives deleted accounts.
- Courses with registrations, surveys with an owner, and versions with responses can't be deleted out from under them.

### Conventions
- Money is an integer in minor units (cents, pesewas, pence) plus a currency.
- Phase 1 ids are kept in `legacyId` for the step-9 import.
- Answers are JSON: a string, a number or a list of strings, depending on the question type.
