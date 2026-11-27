// Team profiles shown on /about/team. Wording and photos are supplied by Afrimetrica; photos are shown in black and
// white and live in public/team/. Add people here only with their agreement.

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo?: string; // under public/team/; without one, the profile shows initials
  bio: string;
}

export const TEAM: TeamMember[] = [
  {
    id: "veselina-stoyanova",
    name: "Veselina Stoyanova, PhD",
    role: "Corporate Strategy Consultant",
    photo: "veselina-stoyanova.webp",
    bio: "Veselina Stoyanova, PhD, is a Corporate Strategy Consultant at Afrimetrica and Associate Professor at the University of Birmingham. She specialises in strategic transformation, organisational capabilities, sustainability, stakeholder engagement and international business. Her expertise combines academic research with practical consulting to help organisations navigate complexity, strengthen competitiveness and deliver sustainable growth.",
  },
  {
    id: "hayford-amegbe",
    name: "Hayford Amegbe, PhD",
    role: "Consultant, Marketing Analytics",
    photo: "hayford-amegbe.webp",
    bio: "Hayford Amegbe, PhD, is a Marketing Analytics Consultant at Afrimetrica and Associate Professor at Rabat Business School. He specialises in customer loyalty and satisfaction, branding, technology adoption, social media, SMEs and entrepreneurship. He holds a PhD in Marketing from Durban University of Technology, South Africa, and an MBA from Maastricht School of Management, and his research has been published in international journals including Technological Forecasting and Social Change and the International Journal of Bank Marketing.",
  },
  {
    id: "samuel-adomako",
    name: "Samuel Adomako, PhD",
    role: "Consultant, Data Analytics",
    photo: "samuel-adomako.webp",
    bio: "Samuel Adomako, PhD, is a Data Analytics Consultant at Afrimetrica and Professor of Entrepreneurship and Innovation at Birmingham Business School, University of Birmingham. His research on entrepreneurship, innovation and sustainability in African and emerging economies has over 11,200 citations, and he was recognised among the world's top 2% of scientists in 2022–2026. He holds a PhD in Entrepreneurship and Innovation from Warwick Business School, University of Warwick, UK.",
  },
  {
    id: "irene-chu",
    name: "Irene Chu, PhD",
    role: "Consultant, Corporate ESG and Sustainability",
    photo: "irene-chu.webp",
    bio: "Irene Chu, PhD, is a Corporate ESG and Sustainability Consultant at Afrimetrica, where she advises and trains corporate clients on ESG, sustainability and ethics. She is Senior Lecturer in International Management at Newcastle University Business School and Associate Editor of Business Strategy and the Environment, and her research appears in journals including the Journal of Business Ethics.",
  },
  {
    id: "mujtaba-ahsan",
    name: "Mujtaba Ahsan, PhD",
    role: "Consultant, AI and Data Science",
    photo: "mujtaba-ahsan.webp",
    bio: "Mujtaba Ahsan, PhD, is an AI and Data Science Consultant at Afrimetrica and Professor of Management at the Fowler College of Business, San Diego State University. His research on entrepreneurship, international business and innovation appears in journals including the Academy of Management Review and Entrepreneurship Theory and Practice. He holds a PhD in Management from the University of Wisconsin-Milwaukee.",
  },
  {
    id: "emmanuel-amoah",
    name: "Emmanuel Amoah, MBA, ACCA",
    role: "Consultant, Route to Market",
    bio: "Emmanuel Amoah, MBA, ACCA, is a Route to Market Consultant at Afrimetrica with over 20 years' experience in multinational corporations across Africa, including Coca-Cola and Promasidor. He advises companies on their route to market and has trained more than 1,000 delegates in route-to-market strategy and market surveys.",
  },
];

/** "Emmanuel Amoah, MBA" -> "EA" */
export const initials = (name: string) =>
  name
    .split(",")[0]!
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Leadership roles: shown by title now; add name, photo and bio as they are confirmed (the card then becomes a full profile). */
export interface LeadershipRole {
  role: string;
  abbr: string;
  name?: string;
  photo?: string; // under public/team/
  bio?: string;
}

export const LEADERSHIP: LeadershipRole[] = [
  { role: "Chief Executive Officer", abbr: "CEO" },
  { role: "Director, Business Development", abbr: "BD" },
  { role: "Director, Finance", abbr: "FIN" },
  { role: "Director, People and Human Capital", abbr: "PHC" },
  { role: "Director, Operations", abbr: "OPS" },
];
