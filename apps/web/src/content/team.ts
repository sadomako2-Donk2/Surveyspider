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
];
