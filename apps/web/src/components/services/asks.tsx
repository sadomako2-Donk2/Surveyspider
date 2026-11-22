import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { TickList } from "@/components/site/sections";

export const AN_STEPS = [
  "You tell us your questions and describe your data. Share it securely when we're ready to start.",
  "We agree an analysis plan, a timeline and a fixed price.",
  "We clean and analyse the data and check the results.",
  "You receive tables, charts and a plain-language summary, and we walk you through them.",
];
export const CO_PHASES: [string, string][] = [
  ["Inception.", "We agree the questions, scope, methods, timeline and budget, usually in an inception report."],
  ["Design.", "Sampling, tools, ethics approvals and consent procedures."],
  ["Data collection.", "Trained teams, digital tools and daily quality checks."],
  ["Analysis.", "Rigorous analysis, checked before anything is reported."],
  ["Reporting and learning.", "Clear reports, briefs and a presentation, with recommendations you can act on."],
];
export const Steps = ({ items }: { items: (string | [string, string])[] }) => (
  <ol className="steps">
    {items.map((x, i) => (
      <li key={i}>
        {typeof x === "string" ? (
          x
        ) : (
          <>
            <b>{x[0]}</b> {x[1]}
          </>
        )}
      </li>
    ))}
  </ol>
);
export const AnalyticsAsk = ({ title, message }: { title: string; message?: string }) => (
  <EnquiryForm
    type="ANALYTICS"
    title={title}
    intro="Describe your data and what you need to know. We'll reply with an approach, a timeline and a quote."
    messageLabel="Your data and questions"
    placeholder="e.g. 1,200 household survey responses in Excel; we need prevalence estimates by region and a regression on food security."
    defaultMessage={message}
  />
);
export const ConsultancyAsk = ({ title, message }: { title: string; message?: string }) => (
  <EnquiryForm
    type="CONSULTANCY"
    title={title}
    intro="Tell us about your project. We'll reply within two working days to arrange a call."
    messageLabel="About your project"
    placeholder="Objectives, target population, locations, deadlines and any terms of reference."
    defaultMessage={message}
  />
);
export { TickList };
