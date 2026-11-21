import type { Metadata } from "next";
import { Importer } from "@/components/surveys/importer/Importer";
import { SurveysNav } from "@/components/surveys/SurveysNav";
import { signedInPage } from "@/server/surveys/pages";

export const metadata: Metadata = { title: "Upload a questionnaire", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await signedInPage("/surveys/import");
  return (
    <main id="main" className="wrap stack">
      <SurveysNav current="import" />
      <div className="page-head">
        <span className="eyebrow">Upload a questionnaire</span>
        <h1>Turn a Word, PDF or Excel file into a survey</h1>
        <p className="lede">
          No retyping. Upload the questionnaire you already have and Afrimetrica Surveys builds the survey for you. Your
          file is read in your browser and is not uploaded.
        </p>
      </div>
      <div className="builder">
        <Importer />
        <aside className="stack">
          <section className="card">
            <h2>How it works</h2>
            <ol className="steps">
              <li>Upload your questionnaire, or paste the text.</li>
              <li>Each question, its answer options and its type are found for you.</li>
              <li>Check the preview, then create the survey and set pay and audience in the builder.</li>
            </ol>
            <h3>For the best result</h3>
            <ul className="steps">
              <li>Number your questions (1. 2. 3.) or end them with a question mark.</li>
              <li>Put each answer option on its own line, or as a bullet or a), b), c).</li>
              <li>Write &ldquo;select all that apply&rdquo; for checkbox questions.</li>
              <li>
                Excel: a file downloaded from Afrimetrica (the Questions sheet) comes back exactly, with types and
                options.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
