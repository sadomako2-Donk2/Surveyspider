// Health check for Render, matching Phase 1's /healthz.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
