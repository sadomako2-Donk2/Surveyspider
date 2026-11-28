# Our People: person-by-person mapping

Page: `/about/team` (URL unchanged), titled **Our people**. Data: `PEOPLE` and `LEADERSHIP` in `public/index.html` (the site's content model; field guide in the comment above `PEOPLE`).

Rules applied: current confirmed titles stay on the site until a recommendation is confirmed. No seniority, employment status, ownership or authority is inferred from a biography. Managing Partner, Partner, Associate Partner, Director and Principal are used only for roles Afrimetrica has named (below). Equity arrangements are not shown.

## People

| Person | Existing title (on the site) | Recommended title | Practice (proposed) | Affiliation type | Rationale | Confirmation status |
|---|---|---|---|---|---|---|
| Veselina Stoyanova, PhD | Corporate Strategy Consultant | Affiliated Expert, Corporate Strategy | Strategy & Advisory | Project-based (Expert Network) | External academic (University of Birmingham) engaged per project; bio centres on strategy, organisational capabilities and sustainability | Affiliation confirmed ("ad hoc consultants"). Title kept by owner on 28 Nov; recommendation and practice **not confirmed** |
| Hayford Amegbe, PhD | Consultant, Marketing Analytics | Affiliated Expert, Marketing Analytics | Data & Intelligence | Project-based | Academic (Rabat Business School); marketing analytics, customer loyalty, branding | As above |
| Samuel Adomako, PhD | Consultant, Data Analytics | Affiliated Expert, Data Analytics (or Research Fellow) | Data & Intelligence | Project-based | Academic (University of Birmingham) with a strong publication record; Research Fellow fits if his role is mainly research and publications | As above; **confirm whether he holds any leadership role** (not inferred) |
| Irene Chu, PhD | Consultant, Corporate ESG and Sustainability | Affiliated Expert, ESG and Sustainability; Associate Faculty | Strategy & Advisory; Executive Education | Project-based | Advises and trains corporate clients on ESG, sustainability and ethics (confirmed by owner) | As above |
| Mujtaba Ahsan, PhD | Consultant, AI and Data Science | Affiliated Expert, AI and Data Science | Data & Intelligence | Project-based | Academic (San Diego State University); entrepreneurship, international business, innovation | As above; "San Diego State University" added by us, confirm |
| Emmanuel Amoah, MBA, ACCA | Consultant, Route to Market | Affiliated Expert, Route to Market; Associate Faculty | Strategy & Advisory; Executive Education | Project-based | 20+ years in multinationals; has trained 1,000+ delegates (confirmed by owner) | As above; portrait missing (initials shown) |
| Stephen Kehinde Medase, PhD | Analyst, Market Intelligence | Analyst, Market Intelligence (already discipline-specific) | Data & Intelligence; Research & Evaluation | Project-based (owner: "just like others") | Researcher (University of Johannesburg); market intelligence | Title and affiliation confirmed; practice **not confirmed** |

Recommended titles follow the report: external specialists are Affiliated Experts; trainers are (Associate) Faculty; academic contributors are Research Fellows. Permanent staff would use the discipline tracks (for example Senior Researcher, Data Scientist, Consultant, Analyst).

## Leadership roles (approved titles, no confirmed appointments)

| Role | Group | Status |
|---|---|---|
| Managing Partner | Leadership & Partners | Title approved 28 Nov; no name confirmed; shown as a role card |
| Partner, Data & Intelligence | Leadership & Partners | As above |
| Partner, Research & Evaluation | Leadership & Partners | As above |
| Partner, Strategy & Advisory | Leadership & Partners | As above |
| Director, Executive Education | Practice Directors | As above |
| Director, Digital Solutions | Practice Directors | As above |

**Conflict to resolve:** the brief says to show only categories with confirmed members and to use partner titles only for confirmed appointments. The owner's decision of 28 November was to show the partner titles. Both are supported: `SHOW_VACANT_ROLES = true` (current) shows the role cards; setting it to `false` hides every role without a confirmed name.

## Maintaining profiles

- Add or edit a person in `PEOPLE`: `name`, `title`, `group`, `affiliation`, `practices`, `photo`, `bio`. Keep bios in the third person, around 50 to 60 words: role at Afrimetrica and current appointment; specialism; qualifications or publications.
- Fill a leadership role by adding `name`, `photo` and `bio` to its entry in `LEADERSHIP` (and `affiliation` once confirmed).
- `practices` drives the filter on Our people. It appears automatically once confirmed practices cover at least two practices.
- Photos go in `public/photos/` as `team-<id>.webp`, black and white, at least 300 × 300 pixels. Alt text is generated as "Portrait of <name>".
- Run `npm test` before publishing.
