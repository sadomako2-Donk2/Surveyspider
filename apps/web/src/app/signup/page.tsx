import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { googleEnabled } from "@/server/config";
import { getCurrentUser } from "@/server/current-user";
import { safeNext } from "@/server/http";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignUp({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <main id="main" className="wrap auth-wrap">
      <AuthForm mode="signup" next={next} google={googleEnabled()} />
    </main>
  );
}
