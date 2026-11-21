import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/server/config";
import { getCurrentUser } from "@/server/current-user";
import { safeNext } from "@/server/http";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  google_off: "Google sign-in isn't switched on yet. Use your email and a password for now.",
  google_email: "Your Google account's email address isn't verified, so we can't use it to sign in.",
  google_conflict: "That email is already linked to a different Google account. Sign in with your password instead.",
  google_failed: "Google sign-in didn't finish. Please try again.",
};

export default async function SignIn({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const next = safeNext(q.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <main className="wrap auth-wrap">
      <AuthForm
        mode="signin"
        next={next}
        google={googleEnabled()}
        initialError={q.error ? (ERRORS[q.error] ?? ERRORS.google_failed) : undefined}
      />
    </main>
  );
}
