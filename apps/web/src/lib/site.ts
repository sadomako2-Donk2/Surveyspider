// Brand facts shared by every page. Keep in sync with docs/requirements.md.
export const SITE = {
  name: "Afrimetrica",
  longName: "Afrimetrica — Centre for Research Methods and Analytics",
  tagline: "Advancing Research, Measurement and Evidence",
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

export function legalLine(): string {
  return `${SITE.name} is operated by ${SITE.operator}, a company registered in ${SITE.operatorCountry}.`;
}
