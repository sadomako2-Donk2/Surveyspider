// Photos on the public pages. A slot shows its file from public/photos/ once it has a description (alt);
// until then it shows nothing on the live site (and a placeholder in development).
// `alt` must describe what the photo actually shows (it's read aloud to blind visitors) and is
// required for every photo that is present: tests/unit/photos.test.ts checks this.
// The current photos are illustrative images, not pictures of Afrimetrica staff or projects, so each
// carries the caption "Illustrative image" and its alt text doesn't name anyone.
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
    caption: "Illustrative image",
    position: "center 30%",
    where: "Home page, wide photo under the opening section",
    suggest: "A training session, fieldwork team or workshop in progress",
  },
  homeAcademy: {
    file: "academy-class.webp",
    alt: "A trainer speaks to a class seated with laptops, in front of a screen titled Research and Data Analytics Training",
    caption: "Illustrative image",
    position: "center 30%",
    where: "Home page, next to “Practical training in research methods”",
    suggest: "Participants working together in an Academy course",
  },
  about: {
    file: "about.jpg",
    alt: "",
    where: "About page, under the heading",
    // Kept for a real photo: an invented picture of the CEO or team would mislead visitors.
    suggest: "A real photo of the CEO or team, or the office in Ghana",
  },
  training: {
    file: "training.webp",
    alt: "A trainer points to charts and a map of Africa on a screen while participants at a table listen and take notes",
    caption: "Illustrative image",
    position: "center 35%",
    where: "Training page, under the heading",
    suggest: "A trainer teaching a class",
  },
  surveys: {
    file: "surveys.webp",
    alt: "An interviewer with a tablet talks with a smiling market trader at her stall",
    caption: "Illustrative image",
    position: "center 35%",
    where: "Surveys page, under the opening section",
    suggest: "An enumerator interviewing someone with a tablet",
  },
  analytics: {
    file: "analytics.webp",
    alt: "Three analysts look at a laptop together, with a dashboard of charts on the wall behind them",
    caption: "Illustrative image",
    position: "center 8%",
    where: "Analytics page, under the heading",
    suggest: "An analyst at work, or a printed report with charts",
  },
  consultancy: {
    file: "consultancy.jpg",
    alt: "",
    where: "Consultancy page, under the heading",
    suggest: "A meeting with a client or partners",
  },
} satisfies Record<string, PhotoSlot>;

export type PhotoKey = keyof typeof PHOTOS;
