# Website imagery: placement manifest

Implements the *Afrimetrica Claude Final Placement Guide* (P01–P19 embedded images, R01–R20 stock register) on the live site (`public/index.html`). Every image is a local WebP in `public/photos/`, listed in `PHOTO` with its rights status. The server serves only the files in that folder (`tests/api.test.mjs` checks each listed photo is served and that P08 and P10 never are).

Rules followed:
- Real photography first. AI illustrations only where the guide names them as fallbacks, always captioned "Illustrative image".
- About uses real photography only.
- No image shows or implies Afrimetrica staff, clients, participants, projects or offices. No alt text names anyone.
- Each image appears on one page, except P05, which is used on two pages of the same practice (Research & Evaluation and its Fieldwork service).
- Desktop: text and image side by side, about 50/50, 4:3 images. Under 860 px: text first, then the image (16:10).
- No slideshows, overlays or animation.

## Manifest

| Page (route) | Component / section | Asset | Source / licence | Status |
|---|---|---|---|---|
| `/` | Home hero, right of headline | `p01-homepage-collaboration.webp` (P01) | Placement guide, embedded image | AI illustration; fallback until R05 is licensed |
| `/about` | About overview, beside opening copy | `about.webp` | Supplied by Afrimetrica | Real photo; licence to confirm |
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
| `/training/venues` | Venues intro | `venues-city.webp` | Supplied by Afrimetrica | Real photo; licence to confirm (unchanged) |
| `/consultancy` | Sectors | `consultancy-workshop.webp` | Supplied by Afrimetrica | Real photo; licence to confirm (slideshow and card photo removed) |

The screenshots were taken from a local copy of the site with a throwaway account, a sample questionnaire (`apps/web/tests/fixtures/customer-feedback.docx`) and 48 generated responses. They contain no real people or real data.

## Removed

| File | Was used on | Why |
|---|---|---|
| `home.webp`, `training.webp`, `surveys.webp`, `consultancy.webp`, `analytics.webp` | Slideshows on Home, About, Training, Surveys, Analytics, Research & Advisory | AI images repeated on every page in autoplay slideshows; replaced by one image per section |
| `fieldwork-team.webp` | Fieldwork service, Research & Advisory card | Replaced by P05 (the guide's research illustration) |
| `vision-city.webp` | Our vision | Guide: Mission and Vision stay text-led |

## Not published

| Asset | Reason |
|---|---|
| P08 generated business district, P10 executive group portrait | Guide: DO NOT PUBLISH (reference only) |
| P02, P07, P11–P19 (supplied photos) | Guide: source and commercial rights unconfirmed. Ready to add once each is cleared |
| P09 digital survey tools | Not needed: real product screenshots used instead |
| R01–R20 stock photos | Not downloaded or verified in this round (see below). Pexels licence allows free commercial use; Unsplash licence likewise, but Unsplash+ photos are paid |
| African Context (R04, R17, R18, P07, P18, P19) | The site has no African Context section; the guide says to skip and report rather than create one |

## Swapping in the real photos

When an R photo (or a cleared P photo) is available:
1. Save the original file outside the repository. Record its URL, creator and licence, and check it matches the guide's preview.
2. Make `name.webp` (1200 px wide) and `name-640.webp` (640 px) with sharp, quality about 78.
3. Point the `PHOTO` entry at the new file, write the alt text, set the rights status (e.g. "Pexels licence: Name, URL"), and remove "AI illustration" so the caption disappears.
4. Run `npm test`.
