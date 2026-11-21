import Link from "next/link";

const LINKS = [
  ["overview", "/surveys", "Overview"],
  ["new", "/surveys/new", "Create"],
  ["mine", "/surveys/mine", "My surveys"],
  ["take", "/surveys/take", "Take surveys"],
] as const;

export function SurveysNav({ current }: { current: (typeof LINKS)[number][0] | "" }) {
  return (
    <nav className="subtabs" aria-label="Afrimetrica Surveys">
      {LINKS.map(([key, href, label]) => (
        <Link key={key} href={href} aria-current={current === key ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
