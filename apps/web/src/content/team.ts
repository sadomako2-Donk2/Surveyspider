// Team profiles shown on /about/team. Wording and photos are supplied by Afrimetrica; photos are shown in black and
// white and live in public/team/. Add people here only with their agreement.

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo: string; // under public/team/
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
    bio: "Samuel Adomako, PhD, is a Data Analytics Consultant at Afrimetrica and Professor of Entrepreneurship and Innovation at Birmingham Business School, University of Birmingham. His research on entrepreneurship, innovation and sustainability in African and emerging economies has over 11,200 citations, and he was recognised among the world's top 2% of scientists in 2022–2026.",
  },
];
