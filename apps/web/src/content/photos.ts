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
    file: "academy-class.webp",
    alt: "A trainer speaks to a class seated with laptops, in front of a screen titled Research and Data Analytics Training",
    position: "center 30%",
    where: "Home page, next to “Practical training in research methods”",
    suggest: "Participants working together in an Academy course",
  },
  about: {
    file: "about.webp",
    alt: "A busy African city street with office towers, traffic and banners reading Innovation for Africa and Data, Research, Analytics, Impact",
    position: "center 40%",
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
} satisfies Record<string, PhotoSlot>;

export type PhotoKey = keyof typeof PHOTOS;
