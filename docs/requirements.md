# Requirements (Phase 1 as built)

## Public site
- Navigation: Home, About, Training, Surveys, Analytics, Consultancy, Resources, Contact, My Account.
- Survey pages show a second navigation bar: Overview, Create, Upload, Paper surveys, My surveys, Analyze, Take surveys, Plans.
- Footer names the legal operator (Regelco International Ltd, Ghana).

## Afrimetrica Academy
- Administrators create courses (8 templates available) with level, format, duration, description, outcomes, audience, certificate flag and dated sessions (venue, seats, fee in USD, GHS, GBP or EUR).
- Visitors see published courses only. A session shows seats left; full and past sessions can't be booked.
- Registration needs a signed-in account with a confirmed email and a phone number. People can register interest without a date. Duplicates are refused. People can cancel their own registration; administrators set Registered, Interest, Confirmed, Attended, Completed or Cancelled.
- No online payment yet: fees are invoiced after registration.

## Enquiries
- Analytics, consultancy, training and general contact forms. No account needed. Name, valid email, consent and a message are required; service, timeline and budget optional.
- Administrators see all enquiries, filter by type, change status (New, Contacted, In progress, Won, Closed) and download CSV. Senders see their own enquiries in My Account.
- Administrators are emailed for each new enquiry, registration and Paper Survey request (needs Resend and ADMIN_EMAILS).

## Knowledge Hub
- Four original guides, a sample size calculator (finite population correction and response rate), survey templates downloadable as Excel, published findings, Google Scholar search and open data links.

## Afrimetrica Surveys
- Unchanged from the earlier platform: builder with many question types and scales, Word/PDF/Excel upload, AI drafting and checking, participant panel with rewards, Analyze workspace, Excel exports, Paper Survey quotes in USD.

## Phase 2 Academy (step 5)
- Visitors: `/training` lists published courses with the next date, fee and seats left; `/training/<course>` shows the full description, outcomes, audience and every date.
- Registration needs a signed-in account with a confirmed email (when email is switched on) and a phone number for dated sessions. Name and email come from the account.
- Past and full dates can't be booked. "Register interest" works with or without dates.
- My Account lists the person's registrations with status; Registered and Interest can be cancelled there.
- Administrators (`/admin`): create courses from 8 templates or blank, edit, publish, archive or delete (only without registrations); add dates with venue, seats and fee in USD, GHS, GBP or EUR; see and filter registrations, set status, download CSV.
- Every administrator action is written to the audit log; administrators (and ADMIN_EMAILS) are emailed for each registration.

## Phase 2 enquiries and admin (step 6)
- Enquiry forms on Training, Analytics, Consultancy and Contact. No account needed. Name, valid email, a message and consent are required; service, timeline and budget are optional choices.
- Admin area tabs: Courses, Registrations, Enquiries, Contact details, Team, Activity.
- Enquiries inbox: filter by type and status, change status (New, Contacted, In progress, Won, Closed), download CSV. Site administrators and ADMIN_EMAILS are emailed for each new enquiry.
- Contact details (email, phone, WhatsApp, address, hours, LinkedIn) appear on the Contact page; blank fields are hidden.
- Team: owners manage everyone; admins add and change analysts and members.
- Activity: the latest 200 audit-log entries, read-only.
- My Account lists the person's enquiries with a plain-language status.
