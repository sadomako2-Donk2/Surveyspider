import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return (
    <main className="wrap auth-wrap">
      <VerifyEmail token={/^[0-9a-f]{64}$/.test(token) ? token : ""} />
    </main>
  );
}
