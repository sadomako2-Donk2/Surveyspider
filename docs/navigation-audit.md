# Navigation and route audit

Branch `navigation-audit` (from `main`). Not deployed.
Companion files: `docs/route-audit.md` (every route, with purpose, content, practice, revised URL, action and dependencies) and `docs/sitemap-final.md` (the final sitemap).

## 1. Inventory

| Type | Count | Notes |
|---|---|---|
| Public pages | 293 | All open at real addresses. 221 are listed in the sitemap (after the two merges); 70 point search engines to a fuller page (68 one-course subjects, the approach page under Research & Advisory, the certificates page under About) |
| Hidden public pages | 2 | `/resources/case-studies`, `/resources/videos`: not linked, not in the sitemap, noindex |
| App pages | 8 groups | Survey builder, upload, my surveys, results, take surveys, sign-in, My Account (5 pages), admin area |
| Aliases | 3 kinds | `#paper-to-pen`, `#library`, and any old `#page` link: each opens the right page |
| Query journeys | 3 | Email confirmation, password reset, Google sign-in return |
| Server routes | 9 | API, sign-in, health, sitemap, robots, photos, browser libraries, icon, share image |

Not linked from the main navigation but reachable and retained: request forms (`/analytics/request`, `/consultancy/request`), the work-with-us form, contact sub-pages (hotel, careers, mailing list), printable catalogues, the admin area and the two hidden placeholders.

## 2. Navigation (implemented)

| Requested | Implemented | Note |
|---|---|---|
| Home | Home | |
| About: Overview, Our People, Approach, Governance where supported | About: Overview, Our people, Our approach, How we're organised, Our mission, Our vision, About our certificates | **Governance omitted**: no verified information on the board or legal structure. Mission, vision, organisation and certificates kept (existing content) |
| Our Practices (five practice pages) | **Our Practices**: overview plus Data & Intelligence, Research & Evaluation, Strategy & Advisory, Executive Education, Digital Solutions | Renamed from "Practices" in this branch. The Analytics and Consultancy service pages sit under it |
| Prominent access to Executive Education | **Executive Education** in the main menu | Warranted: 99 courses, finder, venues, registration |
| Prominent access to Digital Solutions | **Surveys** in the main menu (the Digital Solutions platform) | Warranted: a working survey app. Labelled by the product people use; the Digital Solutions practice page links to it |
| Insights | **Insights** | |
| Contact | **Contact** | |
| (existing) | **My Account** | Client portal, kept |

Journeys retained and tested: course search (finder), course registration and enquiries, survey building, upload and analysis, participant panel, fieldwork quote, Excel and print downloads, My Account, admin area, every enquiry form.

## 3. Duplicates and obsolete material (nothing deleted)

| Pages | Overlap | Action |
|---|---|---|
| `/about/approach` and `/consultancy/approach` | 100% | Merge: search engines pointed to `/about/approach` (done earlier) |
| `/about/certificates` and `/training/certificates` | 47%, same title | Merge: search engines pointed to `/training/certificates` (**new in this branch**) |
| 68 one-course subject pages and their course pages | Most text | Merge: search engines pointed to the course (done earlier) |
| `/analytics` and `/practices/data-intelligence` | 53% | **Merged (decision 28 Nov)**: the how-we-work steps, photo and survey-analysis note moved to the practice page; `/analytics` permanently redirects (301) to `/practices/data-intelligence`; links, breadcrumbs and menus updated |
| `/resources` and `/resources/articles` | 79% | **Redirected (decision 28 Nov)**: `/resources/articles` permanently redirects (301) to `/resources`; the four guide articles keep their own addresses; menu item removed |
| `/consultancy` and the Research & Evaluation / Strategy & Advisory pages | 27–40% | Retain: `/consultancy` is the hub for both practices |
| `/resources/case-studies`, `/resources/videos` | Placeholders | Obsolete until content exists: retained hidden |
| Venue, sector and subject pages | Shared template text | Not duplicates: each has its own subject; retain |

## 4. Migration mapping

Two pages were merged with permanent redirects; every other URL is unchanged and `/about/team` is preserved. Internal links, breadcrumbs, menus, canonical addresses and the sitemap were updated:

| URL | Before | After |
|---|---|---|
| Main menu | Practices | Our Practices |
| Breadcrumbs on practice, analytics and consultancy pages | Practices › … | Our practices › … |
| `/about/certificates` | Listed in the sitemap | Canonical → `/training/certificates`; not in the sitemap; still opens |
| `/analytics` | Data analysis hub | **301 → `/practices/data-intelligence`** (query strings kept; old `#analytics` links redirect in the browser) |
| `/resources/articles` | Guides list | **301 → `/resources`** (guide articles unchanged) |
| Analytics breadcrumbs and "Overview" links | → `/analytics` | → `/practices/data-intelligence` |
| Everything else | — | Unchanged (see `docs/route-audit.md`) |

## 5. Tests

`npm test`: 20 statistics checks and 166 API checks passed (new: certificates canonical; menu label; three redirect checks; merged pages out of the sitemap). Browser checks: see the release notes.
