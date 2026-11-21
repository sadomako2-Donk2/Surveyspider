import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPassword() {
  return (
    <main id="main" className="wrap auth-wrap">
      <ForgotForm />
    </main>
  );
}
