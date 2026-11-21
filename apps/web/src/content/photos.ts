// Photos on the public pages. Each slot shows its file from public/photos/ once that file exists;
// until then the slot shows nothing on the live site (and a placeholder in development).
// `alt` must describe what the photo actually shows (it's read aloud to blind visitors) and is
// required for every photo that is present: tests/unit/photos.test.ts checks this.
// The .svg files are AI-made illustrations (not photos) and are described as illustrations.
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
    file: "insights.svg",
    alt: "Illustration of a data dashboard: a rising trend line, a donut chart and a highlighted insight",
    where: "Home page, wide photo under the opening section",
    suggest: "A training session, fieldwork team or workshop in progress",
  },
  homeAcademy: {
    file: "training.svg",
    alt: "Illustration of a research methods class: a trainer beside a board with a bar chart and the sample size formula, and participants at desks",
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
    file: "training.svg",
    alt: "Illustration of a research methods class: a trainer beside a board with a bar chart and the sample size formula, and participants at desks",
    where: "Training page, under the heading",
    suggest: "A trainer teaching a class",
  },
  surveys: {
    file: "surveys.svg",
    alt: "Illustration of a survey on a tablet, with rating and multiple-choice questions, and results on a phone",
    where: "Surveys page, under the opening section",
    suggest: "An enumerator interviewing someone with a tablet",
  },
  analytics: {
    file: "analytics.svg",
    alt: "Illustration of statistical analysis: a scatter plot with a regression line, a histogram with a normal curve and a results table",
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
