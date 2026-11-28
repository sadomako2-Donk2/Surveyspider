# Afrimetrica design system (live site, Phase 1)

Built from the existing brand: the Afrimetrica logo (sun mark and wordmark, updated tagline), navy and gold, Montserrat for display and Inter for text. All styles live in `public/index.html` (`<style>`); components are template functions in the same file. No front-end framework and no new dependencies.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` / `--surface` | #f5f6f9 / #ffffff | #0a1224 / #111c33 | Page and card backgrounds |
| `--ink` / `--muted` | #0e1d3a / #56627a | #e9edf6 / #9aa6bf | Text (both pass 4.5:1 on their backgrounds) |
| `--accent` | #10285a | #dcb75a | Primary buttons, links |
| `--gold` / `--gold-hi` | #b88a2c / #f2d27e | #dcb75a / #f6dd96 | Brand accents, borders, header focus |
| `--gold-ink` | #85601a | #dcb75a | Gold small text (4.5:1) |
| `--navy-band` | #0e1d3a | #0f1a33 | Header, enquiry bands, role badges |
| `--focus` | #0e1d3a | #f6dd96 | Focus ring (3:1 or better against surroundings) |
| `--good` / `--bad` / `--signal` | status colours | | Success, errors, warnings (always with text) |
| `--font-display` / `--font-body` / `--font-mono` | Montserrat / Inter / system monospace | | Self-hosted from `/fonts` |
| `--space-1` … `--space-7` | 4, 8, 12, 16, 24, 32, 48 px | | Spacing |
| `--radius-s/m/l` | 8, 14, 18 px | | Corners |
| `--step--1` … `--step-4` | 0.85rem … clamp(2.1rem, 5.4vw, 3.6rem) | | Type scale |

## Components (reusable)

| Component | Code | Used on |
|---|---|---|
| Practice card | `practiceCards()`, `.practice-card` | Home, About, Our practices |
| Process diagram | `.flow` (ordered list) | Our practices |
| Person card / role card | `teamCard()`, `roleCard()`, `.person`, `.leader-role` | Our people |
| Insight (guide) link | `.guide-link` | Home, practice pages, Insights |
| Programme listing | `courseCard()`, `courseLines()`, catalogue table | Executive Education, home |
| Service and sector cards | `anServiceCards()`, `coServiceCards()`, `.area-card` | Practice and service pages |
| Breadcrumbs | `abCrumbs()`, `prCrumbs()`, `anCrumbs()`, `coCrumbs()`, `.crumbs` | Every sub-page |
| Contact call to action | `.band` with `.band-item` links | Home, Our practices |
| Enquiry form | `enquiryForm(type, options)` | Contact, practices, services, courses, press, testimonials |
| Section menu | `subLinks()`, `.subnav` | Every section |
| Photo | `pic()`, `slideshow()`, `introMedia()`, `sidePhoto()` | Page introductions and sections |

## Accessibility (WCAG 2.2 AA)

- Skip link to the main content (first Tab stop).
- Visible 3px focus ring everywhere (gold in the navy header); the page scrolls so the sticky header never hides the focused item.
- Mobile: a Menu button (aria-expanded) opens the main menu as a list; Escape closes it and returns focus; it closes after navigation.
- Hover menus also open on keyboard focus and close with Escape; section menus are labelled by section.
- Forms: every field has a visible label; errors are announced (role="alert"), invalid fields are marked (aria-invalid) and linked to the message, and focus moves to the first problem.
- Targets at least 24 × 24 px; contrast checked with axe in light and dark mode.

## Imagery

Real photography first; AI illustrations only as fallbacks (uncaptioned, at the owner's request); About uses real photos only. One image per section, text and image side by side (about 50/50) on desktop, text first on small screens. Image slots are slideshows (owner's request) with a Pause button; About and Contact use real photos only. No image overlays. The full manifest, rights status and the steps for swapping in licensed photos are in `docs/imagery.md`; each photo's status is also in `PHOTO` (`public/index.html`).

No charts implying real data. The practices diagram shows how the practices connect, not figures; product screenshots are labelled as sample data.

## Performance

Fonts: six Latin WOFF2 files (about 118 KB, two preloaded), served by the site with long caching. Photos are WebP with a 640 px copy for phones (`srcset`); only the first image on a page loads straight away, the rest lazily. Excel, Word and PDF libraries load only when used, from `/vendor`. Pages make no third-party requests.

## Open decisions

- Licensed real photos to replace the AI illustrations (see `docs/imagery.md`).
