// Photos on the public pages. A slot shows its file from public/photos/ once it has a description (alt);
// until then it shows nothing on the live site (and a placeholder in development).
// `alt` must describe what the photo actually shows (it's read aloud to blind visitors) and is
// required for every photo that is present: tests/unit/photos.test.ts checks this.
// The current photos are illustrative images, not pictures of Afrimetrica staff or projects:
// their alt text describes the scene and doesn't name anyone.
// Only use photos Afrimetrica owns or has permission to use, of people who agreed to appear.

export interface PhotoSlot {
  file: string; // under public/photos/
  alt: string;
  caption?: string;
  credit?: string;
  /** Which part of the photo to keep when it is cropped (CSS object-position), e.g. "center 30%". */
  position?: string;
  /** Where the slot is, for whoever adds the photo. */
  where: string;
  /** Suggested subject. */
  suggest: string;
}

export const PHOTOS = {
  home: {
    file: "home.webp",
    alt: "A team around a laptop discussing research results, with charts and a map of Africa on a screen behind them",
    position: "center 30%",
    where: "Home page, wide photo under the opening section",
    suggest: "A training session, fieldwork team or workshop in progress",
  },
  homeAcademy: {
    // Empty until a real photo of an Afrimetrica class arrives (the AI-generated one was removed).
    file: "academy-class.webp",
    alt: "",
    position: "center 30%",
    where: "Home page, next to “Practical training in research methods”",
    suggest: "Participants working together in an Academy course",
  },
  about: {
    file: "about.webp",
    alt: "Aerial view of a growing town: red-roofed houses, warehouses and green open land, with more houses in the distance",
    position: "center 55%",
    where: "About page, under the heading",
    // The CEO's photo will get its own place in the "Our team" section when it's ready.
    suggest: "A city or office scene",
  },
  training: {
    file: "training.webp",
    alt: "A trainer points to charts and a map of Africa on a screen while participants at a table listen and take notes",
    position: "center 35%",
    where: "Training page, under the heading",
    suggest: "A trainer teaching a class",
  },
  surveys: {
    file: "surveys.webp",
    alt: "An interviewer with a tablet talks with a smiling market trader at her stall",
    position: "center 35%",
    where: "Surveys page, under the opening section",
    suggest: "An enumerator interviewing someone with a tablet",
  },
  analytics: {
    file: "analytics.webp",
    alt: "Three analysts look at a laptop together, with a dashboard of charts on the wall behind them",
    position: "center 8%",
    where: "Analytics page, under the heading",
    suggest: "An analyst at work, or a printed report with charts",
  },
  consultancy: {
    file: "consultancy.webp",
    alt: "A consultant presents to a group around a meeting table, with a map of Africa and charts on a screen and printed reports on the table",
    position: "center 35%",
    where: "Consultancy page, under the heading",
    suggest: "A meeting with a client or partners",
  },
  venuesCity: {
    file: "venues-city.webp",
    alt: "The Kwame Nkrumah Memorial Park in Accra: the monument and statue above blue fountains under a clear sky",
    position: "center 55%",
    where: "Training venues page, beside the heading",
    suggest: "A city where courses run",
  },
  analyticsTeam: {
    file: "analytics-team.webp",
    alt: "Three women in a meeting around a table with laptops, in an office with large windows",
    position: "center 40%",
    where: "Analytics page, below the slideshow, beside the sectors list",
    suggest: "Analysts working through results together",
  },
  coWorkshop: {
    file: "consultancy-workshop.webp",
    alt: "Participants in a workshop write and draw charts on large sheets of paper spread across a table",
    position: "center 40%",
    where: "Consultancy page, below the slideshow, beside the sectors list",
    suggest: "A stakeholder workshop or project meeting",
  },
  vision: {
    file: "vision-city.webp",
    alt: "Aerial view of a city of red-roofed houses and green trees, with a railway line running towards the horizon under a blue sky",
    position: "center 60%",
    where: "Our vision page, beside the heading",
    suggest: "A wide view of a city or town",
  },
  trainingExec: {
    file: "training-executive.webp",
    alt: "Professionals with laptops in a meeting around a long table in a bright conference room",
    position: "center 50%",
    where: "Training page, 'Executive and in-house training' section",
    suggest: "An executive or in-house training session",
  },
  fieldwork: {
    file: "fieldwork-team.webp",
    alt: "A field team with a tablet and clipboards talks with women in a village, beside thatched houses",
    position: "center 40%",
    where: "Consultancy pages, next to fieldwork",
    suggest: "Enumerators at work in the field",
  },
} satisfies Record<string, PhotoSlot>;

export type PhotoKey = keyof typeof PHOTOS;

/** The home page slideshow, in order: it starts with the first. Every slot listed must have a photo. */
export const SLIDESHOW: PhotoKey[] = ["home", "training", "surveys", "analytics", "consultancy", "about"];

/** A page's slideshow: its own photo(s) first, then the rest in SLIDESHOW order. */
export function slidesStartingWith(...first: PhotoKey[]) {
  return [...first, ...SLIDESHOW.filter((k) => !first.includes(k))].map((k) => {
    const p: PhotoSlot = PHOTOS[k];
    return { file: p.file, alt: p.alt, position: p.position };
  });
}
