// Photos on the public pages. Each slot shows its file from public/photos/ once that file exists;
// until then the slot shows nothing on the live site (and a placeholder in development).
// `alt` must describe what the photo actually shows (it's read aloud to blind visitors) and is
// required for every photo that is present: tests/unit/photos.test.ts checks this.
// Only use photos Afrimetrica owns or has permission to use, of people who agreed to appear.

export interface PhotoSlot {
  file: string; // under public/photos/
  alt: string;
  caption?: string;
  credit?: string;
  /** Where the slot is, for whoever adds the photo. */
  where: string;
  /** Suggested subject. */
  suggest: string;
}

export const PHOTOS = {
  home: {
    file: "home.jpg",
    alt: "",
    where: "Home page, wide photo under the opening section",
    suggest: "A training session, fieldwork team or workshop in progress",
  },
  homeAcademy: {
    file: "home-academy.jpg",
    alt: "",
    where: "Home page, next to “Practical training in research methods”",
    suggest: "Participants working together in an Academy course",
  },
  about: {
    file: "about.jpg",
    alt: "",
    where: "About page, under the heading",
    suggest: "The team, or the office in Ghana",
  },
  training: {
    file: "training.jpg",
    alt: "",
    where: "Training page, under the heading",
    suggest: "A trainer teaching a class",
  },
  surveys: {
    file: "surveys.jpg",
    alt: "",
    where: "Surveys page, under the opening section",
    suggest: "An enumerator interviewing someone with a tablet",
  },
  analytics: {
    file: "analytics.jpg",
    alt: "",
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
