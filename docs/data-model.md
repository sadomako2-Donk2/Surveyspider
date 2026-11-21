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

## Phase 2 target (PostgreSQL via Prisma)
User, Organisation, Membership(role) · Course, CourseSession, Enrollment · Survey, SurveyVersion (immutable once published), Question · Response, Answer, ConsentRecord · ConsultancyEnquiry, AnalyticsEnquiry · AuditEvent · Subscription, Payment (later).
Responses reference a SurveyVersion, never a mutable Survey.
