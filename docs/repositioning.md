# Afrimetrica repositioning: handover

Branch: `repositioning` (from `main`). **Not deployed.** Render deploys only `main`; nothing on www.afrimetrica.com has changed.
Source: *Afrimetrica Strategy and Claude Website Prompts* (leadership discussion paper, 28 November 2026), treated as a proposed strategy, not as evidence of appointments or capabilities.

## 1. What was implemented

| Area | Change |
|---|---|
| Positioning | "Data. Research. Advisory. Executive Education." Description: "An independent, Africa-focused professional services firm specialising in data intelligence, research, strategic advisory and executive education." Used on the home page, footer, page titles, search descriptions and social previews. British English throughout. |
| Practices | Five practices with new pages under `/practices`: Data & Intelligence, Research & Evaluation, Strategy & Advisory, Executive Education, Digital Solutions. Each page is built only from services already on the site (see section 3). |
| Navigation | Home, About, **Practices**, **Executive Education** (the training section), Surveys (the Digital Solutions platform), **Insights** (formerly Resources), Contact, My Account. Analytics and Consultancy pages now sit under Practices; their URLs are unchanged. |
| Home page | New headline and description, five practice entry points, "Who we serve" (governments, businesses, development institutions, civil society), upcoming programmes, insights, enquiry band. |
| About | Overview rewritten from section 11 of the report (adapted to verified facts); **Our people**; **Our approach** (new `/about/approach`); **How we're organised** (one firm, five practices); mission, vision and certificates retained. |
| Our people (`/about/team`, URL kept) | Groups: Leadership & Partners, Practice Directors, Professional Team, Fellows & Faculty, Expert Network. Only groups with confirmed people are shown. All seven current profiles keep their confirmed titles and appear under **Expert Network** ("ad hoc consultants"). |
| Names | Afrimetrica Academy → Afrimetrica Executive Education; Knowledge Hub → Insights; Afrimetrica Analytics → Data & Intelligence; Afrimetrica Consulting → Research & Advisory; "associate network" → "expert network". |
| Staging | `NOINDEX=1` environment variable: robots.txt blocks all crawling, every page and response says noindex. Production (no variable) is unchanged and indexable. |
| Accessibility | Dark-mode contrast fix for the "New" badge (an existing issue on the live site). |

Full route-by-route table: `docs/repositioning-routes.md` (293 public addresses: 286 existing, all retained; 7 new). No URL changed, so no redirects were needed; old `#` links still work.

## 2. Files changed

`public/index.html` (navigation, practices, copy, Our people), `server.mjs` (titles and descriptions, `/practices` addresses, `NOINDEX`), `scripts/build-pages.mjs` and `public/pages.json` (page list: practices added, `/consultancy/approach` points to `/about/approach`), `tests/api.test.mjs` (13 new checks), `docs/`.

## 3. Practice mapping (existing services only)

| Practice | Existing services and pages | In the report but not offered on the site (not published) |
|---|---|---|
| Data & Intelligence | All 8 analytics services (statistics; survey analysis; M&E analysis; dashboards and BI; data management; market and customer analytics; predictive analytics, ML and AI; qualitative analysis), 8 sectors, tools, data security | Econometrics as a named service, geospatial analysis, visualisation as a separate service |
| Research & Evaluation | Research design; surveys and fieldwork (and the fieldwork quote tool); M&E systems; baseline, mid-term and final evaluations; commissioned studies | Public opinion research, social and economic research programmes |
| Strategy & Advisory | Policy research; strategy and organisational development; feasibility, market and baseline studies | Development advisory, government advisory retainers |
| Executive Education | The whole training section: 99 courses, 11 areas, 25 venue countries, in-house programmes, certificates of completion (not accredited) | Formal programme director / faculty structure |
| Digital Solutions | Afrimetrica Surveys: builder, Word/PDF/Excel upload, participant panel, built-in analysis, AI checks and reports, plans | Information systems, research infrastructure, proprietary software beyond the survey platform, data products, subscriptions, licensing |

## 4. Our people: proposed mapping (all need confirmation; nothing changed on the page)

| Person | Current title (kept) | Proposed title | Practice | Affiliation | Status |
|---|---|---|---|---|---|
| Veselina Stoyanova, PhD | Corporate Strategy Consultant | Affiliated Expert, Corporate Strategy | Strategy & Advisory | Expert Network (or Research Fellow) | Needs confirmation |
| Hayford Amegbe, PhD | Consultant, Marketing Analytics | Affiliated Expert, Marketing Analytics | Data & Intelligence | Expert Network | Needs confirmation |
| Samuel Adomako, PhD | Consultant, Data Analytics | Affiliated Expert, Data Analytics (or Research Fellow) | Data & Intelligence | Expert Network | Needs confirmation; also confirm whether he holds a leadership role |
| Irene Chu, PhD | Consultant, Corporate ESG and Sustainability | Affiliated Expert, ESG and Sustainability / Associate Faculty | Strategy & Advisory; Executive Education | Expert Network or Fellows & Faculty | Needs confirmation |
| Mujtaba Ahsan, PhD | Consultant, AI and Data Science | Affiliated Expert, AI and Data Science | Data & Intelligence | Expert Network | Needs confirmation; "San Diego State University" added by us |
| Emmanuel Amoah, MBA, ACCA | Consultant, Route to Market | Affiliated Expert, Route to Market / Associate Faculty | Strategy & Advisory; Executive Education | Expert Network | Needs confirmation; photo missing |
| Stephen Kehinde Medase, PhD | Analyst, Market Intelligence | Analyst, Market Intelligence (discipline title fits) | Data & Intelligence | Professional Team if employed, otherwise Expert Network | Needs confirmation of employment status |

Leadership: the five role cards added earlier (Chief Executive Officer; Directors of Business Development, Finance, People and Human Capital, Operations) are **not shown** on this branch, because the report says to show only confirmed people. The roles are kept in the code (`LEADERSHIP`) and appear automatically once a name is added. The report proposes Managing Partner / Partner titles instead; no partner title is used anywhere on the site.

## 5. Discrepancies and assumptions

1. **Logo artwork** still reads "DATA • RESEARCH • EXECUTIVE TRAINING" (header, footer, social preview image). It's an image, so it needs a designer update to "Data · Research · Advisory · Executive Education". Alt text describes the image as it is.
2. **Africa-focused vs global.** The report says Africa-focused; earlier instructions made the site global and added international venues (UK, Ireland, Netherlands, France, Singapore, San Diego). Implemented as "Africa-focused … in Africa and beyond", venues kept.
3. **Leadership placeholders** hidden (see section 4); this reverses an earlier request, pending your decision.
4. **Mission statement** reworded to name the four audiences and add advice; vision kept. Needs approval.
5. The report used afrimetricaconsulting.com as supplementary context; its relationship to Afrimetrica is unconfirmed and nothing was taken from it.
6. **Governance** page not created: no verified information about the board or legal structure.
7. "Who we serve" lists target audiences and what we offer them; no clients, logos, testimonials, case studies or impact figures were added.
8. Editorial gaps (shown honestly, not filled): no course dates or fees; no case studies or videos (hidden); 12 short pages (mission, vision, certificates, contact sub-pages, press, testimonials, catalogues).
9. **Phase 2** (`apps/web`, the next version of the site) does not have these changes yet; port after approval.
10. Survey answers, accounts, enquiries, registrations, emails, payments (none exist), admin area and legal pages are unchanged.

## 6. Tests run (actual results)

- `npm test`: 20 statistics checks and 161 API checks passed (13 new: practice pages served, listed and canonical; positioning; menu; old names gone; approach canonical; old URLs still open; production indexable; staging noindex).
- Browser crawl of all 224 listed pages: no errors, no broken links (292 internal links checked), one heading per page, no duplicate descriptions, no placeholder text.
- Navigation script (16 checks): menus, hover menus, clean addresses, back/forward, old `#` links, deep links, app pages, course search, sign-in: all passed.
- Accessibility (axe): 25 pages × desktop, phone and dark mode; no serious issues after the badge fix; no sideways scrolling.
- Not tested: real email delivery, Google sign-in (not enabled live), a real Render staging service (no staging service exists yet).

## 7. Staging, release and rollback

Staging options (your choice):
- **Render staging service**: Render, New, Web Service, this repository, branch `repositioning`; set `NOINDEX=1`; do **not** set `PUBLIC_URL`; use a separate disk. Gives a private onrender.com address to review.
- **Locally**: `git checkout repositioning && npm start`, then open http://localhost:10000.

Release (only after approval): merge `repositioning` into `main` (Render deploys automatically), then re-check the sitemap and Search Console.
Rollback: Render, surveyspider, Events, **Rollback** to the previous deploy; or revert the merge commit on `main`.

## 8. Owner approval checklist

- [ ] Positioning line and description
- [ ] Practice names and what each covers (section 3)
- [ ] Navigation labels (Practices, Executive Education, Surveys, Insights)
- [ ] Each person's title, practice and affiliation (section 4)
- [ ] Leadership: hide, show roles, or switch to partner titles; names when ready
- [ ] Mission wording; Africa-focused vs global wording
- [ ] Logo artwork update
- [ ] Staging review
- [ ] Production release
