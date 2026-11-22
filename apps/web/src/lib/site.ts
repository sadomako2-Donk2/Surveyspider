// Brand facts shared by every page. Keep in sync with docs/requirements.md.
export const SITE = {
  name: "Afrimetrica",
  longName: "Afrimetrica — Research Methods and Analytics",
  tagline: "Advancing Research, Measurement and Evidence",
  // The legal operator. Kept for documents and invoices; by the owner's choice it isn't shown on the website.
  operator: "Regelco International Ltd",
  operatorCountry: "Ghana",
} as const;

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/training", label: "Training" },
  { href: "/surveys", label: "Surveys" },
  { href: "/analytics", label: "Analytics" },
  { href: "/consultancy", label: "Consultancy" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "My Account" },
] as const;
