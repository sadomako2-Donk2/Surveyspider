import { getDb } from "@/lib/db";
import { summarise } from "@/lib/analysis";
import { requireUser } from "@/server/auth/guards";
import { handle } from "@/server/auth/handlers";
import { fail, json } from "@/server/http";
import { loadAnalysis } from "@/server/surveys/analysis";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Per-question summaries for the survey's owner. Everyone else, administrators included, gets "not found". */
export const GET = async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  return handle(async (r, db) => {
    const { user, error } = await requireUser(db, r);
    if (error) return error;
    const a = await loadAnalysis(db, user.id, id);
    if (!a) return fail(404, "not_found", "Survey not found.");
    const approved = a.rows.filter((x) => x.status === "APPROVED");
    return json(200, {
      responses: approved.length,
      waitingForReview: a.totals.flagged,
      questions: a.questions.map((q) => ({ id: q.id, text: q.text, type: q.type, summary: summarise(q, approved) })),
    });
  })(req, getDb());
};
