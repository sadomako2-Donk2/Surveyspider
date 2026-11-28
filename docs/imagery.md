# Website imagery: placement manifest

Implements the *Afrimetrica Claude Final Placement Guide* (P01–P19 embedded images, R01–R20 stock register) on the live site (`public/index.html`). Every image is a local WebP in `public/photos/`, listed in `PHOTO` with its rights status. The server serves only the files in that folder (`tests/api.test.mjs` checks each listed photo is served and that P08 and P10 never are).

Rules followed:
- Real photography first. AI illustrations only where the guide names them as fallbacks, no longer captioned on the page (owner's decision, November 2026); they are never presented as Afrimetrica staff, clients or projects.
- About uses real photography only.
- No image shows or implies Afrimetrica staff, clients, participants, projects or offices. No alt text names anyone.
- Each image appears on one page, except P05, which is used on two pages of the same practice (Research & Evaluation and its Fieldwork service).
- Desktop: text and image side by side, about 50/50, 4:3 images. Under 860 px: text first, then the image (16:10).
- Slideshows (owner's request): every image slot on the public pages cycles through its photos every 5 seconds, starting with that section's own picture. There is a Pause button; it starts paused for people who ask for reduced motion; only the photo on show is downloaded with the page. About and Contact cycle through real photos only. Screenshots (Digital Solutions, Surveys) stay still. No overlays.

## Manifest

| Page (route) | Component / section | Asset | Source / licence | Status |
|---|---|---|---|---|
| `/` | Home hero, right of headline | `p01-homepage-collaboration.webp` (P01) | Placement guide, embedded image | AI illustration; fallback until R05 is licensed |
| `/about` | About overview, beside opening copy | `about-memorial-park.webp` (Kwame Nkrumah Memorial Park, Accra) | Supplied by Afrimetrica | Real photo; licence to confirm; 460 px wide, so a larger original would look sharper |
| `/about/vision` | Vision | none (photo removed) | n/a | Text-led, as the guide requires |
| `/about/mission` | Mission | none | n/a | Text-led, unchanged |
| `/about/approach` | Our approach | none | n/a | R20 not licensed; text-led, unchanged |
| `/about/team` | Leadership and consultants | existing portraits only | Supplied by Afrimetrica | Unchanged; P10 not used |
| `/practices/data-intelligence` | Practice intro | `p04-data-analytics.webp` (P04) | Placement guide | AI illustration; fallback until R11 is licensed |
| `/practices/data-intelligence` | How we work | `analytics-team.webp` | Supplied by Afrimetrica | Real photo; licence to confirm (unchanged) |
| `/practices/research-evaluation` | Practice intro | `p05-field-research.webp` (P05) | Placement guide | AI illustration; fallback until R13 and R16 are licensed |
| `/consultancy/service/fieldwork` | Fieldwork quote block | `p05-field-research.webp` (P05) | Placement guide | AI illustration; replaces the older AI fieldwork image |
| `/practices/strategy-advisory` | Practice intro | `p06-strategic-advisory.webp` (P06) | Placement guide | AI illustration; fallback until R06 is licensed |
| `/practices/executive-education` | Practice intro | `p03-executive-education.webp` (P03) | Placement guide | AI illustration; fallback until R10 is licensed |
| `/practices/digital-solutions` | Practice intro | `screen-builder.webp` | Screenshot of Afrimetrica Surveys with sample data | Real product screenshot |
| `/surveys` | Below the hero (was slideshow) | `screen-results.webp` | Screenshot of Afrimetrica Surveys with sample data | Real product screenshot |
| `/training` | Executive and in-house training | `training-executive.webp` | Supplied by Afrimetrica | Real photo; licence to confirm (unchanged; slideshow removed) |
| `/contact` | Contact intro (slideshow, real photos only) | `venues-city.webp` (Kwame Nkrumah Memorial Park, Accra) first | Supplied by Afrimetrica | Real photo; licence to confirm; also on Training venues, at the owner's request |
| `/training/venues` | Venues intro | `venues-city.webp` | Supplied by Afrimetrica | Real photo; licence to confirm (unchanged) |
| `/consultancy` | Sectors | `consultancy-workshop.webp` | Supplied by Afrimetrica | Real photo; licence to confirm (slideshow and card photo removed) |

The screenshots were taken from a local copy of the site with a throwaway account, a sample questionnaire (`apps/web/tests/fixtures/customer-feedback.docx`) and 48 generated responses. They contain no real people or real data.

## Removed

- P19 (high-rise buildings with a company's branding) was taken out of all slideshows at the owner's request, and its files deleted.
- The earlier AI photos (home, training, surveys, analytics, consultancy, fieldwork-team) were brought back at the owner's request: on the Home slideshow and in their own sections' slideshows (Executive Education tab, Data & Intelligence, Research & Evaluation, Fieldwork, Strategy & Advisory).


| File | Was used on | Why |
|---|---|---|
| `home.webp`, `training.webp`, `surveys.webp`, `consultancy.webp`, `analytics.webp` | Slideshows on Home, About, Training, Surveys, Analytics, Research & Advisory | AI images repeated on every page in autoplay slideshows; replaced by one image per section |
| `about.webp` (aerial view of a town) | About overview | Replaced at the owner's request by the Memorial Park photo |
| `fieldwork-team.webp` | Fieldwork service, Research & Advisory card | Replaced by P05 (the guide's research illustration) |
| `vision-city.webp` | Our vision | Guide: Mission and Vision stay text-led |

## All guide pictures in use (owner's request)

The owner asked for all 20 pictures (P01–P19 and the Memorial Park photo) to be used, and for every picture to be a slideshow. Each slideshow is a set in `SLIDE_SETS` (`public/index.html`); each has its own Pause button and starts paused for people who ask for reduced motion.

| Slideshow (page, place) | Photos, in order |
|---|---|
| Home, hero | P01, then the earlier AI photos (home, training, surveys, analytics, consultancy), P02, P08, P07 |
| About Us, opening | Memorial Park (drummers), P13, P18, Memorial Park (monument) |
| Contact, opening | Memorial Park (monument), P07, P18, Memorial Park (drummers) |
| Executive Education tab, opening | P03, P11, P12, P13 |
| Executive Education tab, in-house training | training-executive, P16, P02 |
| Training venues | Memorial Park (monument), P18, P07 |
| Executive Education practice | P03, P11, P12, training-executive |
| Data & Intelligence, opening / how we work | P04, P14, P09 / analytics-team, P17, P15 |
| Research & Evaluation | P05, P15, consultancy-workshop |
| Fieldwork service | P05, consultancy-workshop, P15 |
| Research & Advisory hub, sectors | consultancy-workshop, P06, P05, P16 |
| Strategy & Advisory | P06, P16, P17, P10 |
| Digital Solutions | builder screenshot, results screenshot, P09 |
| Surveys | results screenshot, builder screenshot |
| Our approach (About Us and Research & Advisory) | AI photos: home, fieldwork-team, surveys, analytics, consultancy (owner's request) |
| Insights overview | AI photos: P04, analytics, P09, training (owner's request) |
| How we're organised | Supplied photos: org-discussion, org-presentation, org-meeting, org-laptop (licence to confirm; org-presentation shows a coworking brand on the mugs) |
| Our mission | Supplied photos: mission-meeting and mission-training (appear AI-generated), mission-speaker (appears to be a stock photo), mission-audience (conference event; licence to confirm) |

Notes:
- P08 and P10 were marked "do not publish" in the guide; they are used at the owner's request, no longer captioned, and P10 never appears on Our People or beside profiles.
- About and Contact show real photographs only.
- P02, P07 and P11–P19 still have **unconfirmed source and licence**; the guide notes some may be stock photos that need a licence. P02 shows third-party signage and P19 a building's branding.

`tests/api.test.mjs` fails if any photo in `public/photos` is not used.

## Not used

| Asset | Reason |
|---|---|
| R01–R20 stock photos | Not downloaded or verified (see below). Pexels licence allows free commercial use; Unsplash licence likewise, but Unsplash+ photos are paid |
| African Context section | The site has no such section; the city photos (P07, P18, P19) appear in the Home, About and Contact slideshows instead |

## Swapping in the real photos

When an R photo (or a cleared P photo) is available:
1. Save the original file outside the repository. Record its URL, creator and licence, and check it matches the guide's preview.
2. Make `name.webp` (1200 px wide) and `name-640.webp` (640 px) with sharp, quality about 78.
3. Point the `PHOTO` entry at the new file, write the alt text, set the rights status (e.g. "Pexels licence: Name, URL"), and remove "AI illustration" so the caption disappears.
4. Run `npm test`.
