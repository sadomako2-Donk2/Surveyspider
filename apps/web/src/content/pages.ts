// Public-site wording, carried over from Phase 1 (public/index.html) so both sites say the same thing.

export interface Unit {
  key: "training" | "surveys" | "analytics" | "consultancy";
  href: string;
  brand: string;
  title: string;
  text: string;
  points: string[];
  cta: string;
}

export const UNITS: Unit[] = [
  {
    key: "training",
    href: "/training",
    brand: "Afrimetrica Academy",
    title: "Data, research and executive training",
    text: "Classroom, live online and in-house courses in data and research skills, monitoring and evaluation, and executive programmes in strategy, leadership, governance, finance and projects.",
    points: [
      "Executive and technical programmes",
      "In-house training for your organisation",
      "Certificates of completion",
    ],
    cta: "Explore training",
  },
  {
    key: "surveys",
    href: "/surveys",
    brand: "Afrimetrica Surveys",
    title: "Survey tools",
    text: "Build questionnaires, collect responses online or face to face, and analyse them with built-in statistics and AI.",
    points: ["Word, PDF and Excel upload", "Paid participant panel", "Analysis and Excel reports"],
    cta: "Start a survey",
  },
  {
    key: "analytics",
    href: "/analytics",
    brand: "Afrimetrica Analytics",
    title: "Data analysis",
    text: "Statistical analysis, dashboards and data management carried out by experienced analysts.",
    points: ["Descriptive to multivariate analysis", "Dashboards and reports", "Data cleaning and management"],
    cta: "Request analysis",
  },
  {
    key: "consultancy",
    href: "/consultancy",
    brand: "Afrimetrica Consulting",
    title: "Research and evaluation consultancy",
    text: "Research design, monitoring and evaluation, surveys and commissioned studies, from proposal to final report.",
    points: ["Study design and protocols", "Monitoring and evaluation", "Fieldwork and reporting"],
    cta: "Discuss a project",
  },
];

export interface Guide {
  slug: string;
  title: string;
  minutes: number;
  summary: string;
  sections: { heading: string; body: string; sampleTable?: boolean }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "writing-clear-survey-questions",
    title: "Writing clear survey questions",
    minutes: 4,
    summary: "Five habits that make answers more accurate and easier to analyse.",
    sections: [
      {
        heading: "Ask about one thing at a time",
        body: "“How satisfied are you with the price and quality?” mixes two ideas, so people who like one and dislike the other can't answer honestly. Split it into two questions.",
      },
      {
        heading: "Keep the wording neutral",
        body: "Avoid phrases that suggest the ‘right’ answer, such as “Don't you agree that…” or “How much did you enjoy…”. Ask “How would you rate…” instead.",
      },
      {
        heading: "Make answer options complete and distinct",
        body: "Options should not overlap (18–25 and 25–35 both include 25) and should cover every likely answer. Add “Other” or “Not sure” where people may not fit.",
      },
      {
        heading: "Use words your respondents use",
        body: "Replace jargon and acronyms with everyday language, and define any term that must stay technical. Translate and back-translate for each language you use.",
      },
      {
        heading: "Pilot before you launch",
        body: "Ask five to ten people from your target group to answer the questionnaire and tell you what was unclear. Afrimetrica Surveys' AI question checker can also flag problem wording.",
      },
    ],
  },
  {
    slug: "how-many-responses-do-you-need",
    title: "How many responses do you need?",
    minutes: 5,
    summary: "Margin of error in plain language, with common sample sizes.",
    sections: [
      {
        heading: "Start with the precision you need",
        body: "A margin of error of ±5% means a result of 60% could really be anywhere from 55% to 65%. Smaller margins need many more responses.",
      },
      {
        heading: "Common sample sizes (95% confidence, large population)",
        body: "",
        sampleTable: true,
      },
      {
        heading: "Plan for the groups you will compare",
        body: "If you want to compare men and women, or regions, each group needs enough responses on its own. Precision for a subgroup of 100 is about ±10%, whatever the total sample.",
      },
      {
        heading: "Allow for people who won't respond",
        body: "If you expect 40% of invited people to respond and need 400 completed surveys, invite about 1,000.",
      },
      {
        heading: "Small populations need fewer",
        body: "When your whole population is small (for example 300 staff), the finite population correction reduces the number needed. Use the calculator on this page.",
      },
    ],
  },
  {
    slug: "likert-or-rating-scale",
    title: "Likert or rating scale?",
    minutes: 3,
    summary: "Choosing scales, points and labels, and how to analyse them.",
    sections: [
      {
        heading: "Use a labelled Likert scale for agreement, satisfaction and frequency",
        body: "Labels such as “Strongly disagree … Strongly agree” or “Never … Always” are easy to interpret and translate well.",
      },
      {
        heading: "Use a numbered rating for intensity and recommendation",
        body: "0–10 likelihood-to-recommend and 1–10 confidence ratings give finer detail. Label both ends so the meaning is clear.",
      },
      {
        heading: "Five or seven points?",
        body: "Five points work well for most audiences and on paper. Seven points add sensitivity for experienced respondents. Keep a neutral middle unless you have a reason to force a choice.",
      },
      {
        heading: "Keep the direction consistent",
        body: "Run every scale in the same direction across the questionnaire to avoid mistakes.",
      },
      {
        heading: "Analyse in more than one way",
        body: "Report the percentage choosing the top two points (‘top-2 box’) alongside averages, and look at the full distribution when opinions are split.",
      },
    ],
  },
  {
    slug: "planning-monitoring-and-evaluation",
    title: "Planning monitoring and evaluation",
    minutes: 5,
    summary: "From theory of change to indicators, baselines and learning.",
    sections: [
      {
        heading: "Begin with a theory of change",
        body: "Set out how your activities are expected to lead to outputs, outcomes and impact, and the assumptions that must hold.",
      },
      {
        heading: "Choose a small set of good indicators",
        body: "Each indicator should be specific, measurable, attainable, relevant and time-bound, with a clear definition, data source and frequency.",
      },
      {
        heading: "Measure a baseline",
        body: "Collect the starting value of each indicator before activities begin, otherwise change cannot be shown.",
      },
      {
        heading: "Match methods to questions",
        body: "Routine monitoring tracks progress; evaluations ask whether and why change happened. Combine surveys, records and qualitative methods where useful.",
      },
      {
        heading: "Build in learning",
        body: "Agree when results will be reviewed, who will act on them and how decisions will be recorded.",
      },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

export interface ServiceCard {
  title: string;
  text: string;
}

export const ANALYTICS_CARDS: ServiceCard[] = [
  {
    title: "Statistical analysis",
    text: "Descriptive statistics, hypothesis tests, regression and multivariate methods, with clear write-ups of what the results mean.",
  },
  {
    title: "Dashboards and reporting",
    text: "Interactive dashboards and polished reports that keep decision-makers up to date.",
  },
  {
    title: "Data management and cleaning",
    text: "Data entry, cleaning, coding, merging and documentation so your dataset is analysis-ready.",
  },
  {
    title: "Survey and M&E data",
    text: "Weighting, indicator calculation and trend analysis for surveys and monitoring systems.",
  },
];

export const CONSULTANCY_CARDS: ServiceCard[] = [
  {
    title: "Research design and methodology",
    text: "Study designs, sampling plans, protocols and data collection tools tailored to your questions and budget.",
  },
  {
    title: "Monitoring and evaluation",
    text: "Theories of change, results frameworks, baselines, mid-term and final evaluations.",
  },
  {
    title: "Surveys and fieldwork",
    text: "Online, telephone and face-to-face data collection with trained field teams and quality checks.",
  },
  {
    title: "Commissioned studies and reports",
    text: "End-to-end studies, from inception report to final report and presentation.",
  },
];

// Choices offered in the enquiry forms (step 6).
export const ANALYTICS_SERVICES = [
  "Statistical analysis",
  "Dashboards and reporting",
  "Data management and cleaning",
  "Survey data analysis",
  "Monitoring and evaluation data",
  "Something else",
];
export const CONSULT_SERVICES = [
  "Research design and methodology",
  "Monitoring and evaluation",
  "Surveys and fieldwork",
  "Questionnaire review",
  "Commissioned study or report",
  "Something else",
];
export const TRAINING_SERVICES = [
  "A public short course",
  "An in-house workshop for my organisation",
  "Online learning",
  "Something else",
];
export const TIMELINES = ["As soon as possible", "Within a month", "1–3 months", "3–6 months", "Not sure yet"];
export const BUDGETS = ["Under US$1,000", "US$1,000–5,000", "US$5,000–20,000", "Over US$20,000", "Not sure yet"];

export const OPEN_DATA = [
  {
    name: "World Bank Open Data",
    href: "https://data.worldbank.org",
    text: "Country economic and development indicators",
  },
  {
    name: "Ghana Statistical Service",
    href: "https://statsghana.gov.gh",
    text: "Census, surveys and official statistics for Ghana",
  },
  {
    name: "DHS Program",
    href: "https://dhsprogram.com",
    text: "Demographic and Health Surveys from over 90 countries",
  },
  {
    name: "Afrobarometer",
    href: "https://www.afrobarometer.org",
    text: "Public attitude surveys across African countries",
  },
  { name: "Pew Research Center", href: "https://www.pewresearch.org", text: "Public opinion and demographic surveys" },
];
