import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return (
    <main className="wrap auth-wrap">
      <ResetForm token={/^[0-9a-f]{64}$/.test(token) ? token : ""} />
    </main>
  );
}
