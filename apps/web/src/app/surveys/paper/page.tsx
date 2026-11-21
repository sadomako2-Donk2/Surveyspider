import type { Metadata } from "next";
import { FieldworkQuote } from "@/components/fieldwork/FieldworkQuote";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { getDb } from "@/lib/db";
import { normaliseQuestion } from "@/lib/surveys";
import { getCurrentUser } from "@/server/current-user";

export const metadata: Metadata = {
  title: "Paper surveys",
  description:
    "Face-to-face questionnaires, in-depth interviews and focus groups by Afrimetrica field teams. Upload your questionnaire and get an itemised quote in US dollars.",
  alternates: { canonical: "/surveys/paper" },
};
export const dynamic = "force-dynamic";

export default async function PaperSurveys() {
  const user = await getCurrentUser().catch(() => null);
  const mine = user
    ? await getDb().survey.findMany({
        where: { ownerId: user.id },
        include: {
          versions: { orderBy: { number: "desc" }, take: 1, include: { questions: { orderBy: { position: "asc" } } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      })
    : [];
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="paper" />
      <div className="page-head">
        <span className="eyebrow">Paper surveys</span>
        <h1>Face-to-face surveys and interviews, priced instantly</h1>
        <p className="lede">
          Our field teams interview people in person, on paper or tablet, for questionnaires, one-to-one interviews and
          focus groups. Upload your questionnaire and see the full price in US dollars straight away. No account needed.
        </p>
      </div>
      <FieldworkQuote
        mySurveys={mine
          .filter((s) => s.versions[0]?.questions.length)
          .map((s) => {
            const v = s.versions[0]!;
            return {
              id: s.id,
              title: v.title,
              source: "My surveys",
              questions: v.questions
                .map((q) => normaliseQuestion(q))
                .map((q) => ({ type: q.type, text: q.text, options: q.options })),
            };
          })}
      />
    </main>
  );
}
