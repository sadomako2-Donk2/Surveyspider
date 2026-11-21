import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { ContactSettingsForm } from "@/components/enquiries/AdminControls";
import { adminPage } from "@/server/admin-page";
import { getContactSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Contact details · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Settings() {
  if (!(await adminPage("/admin/settings")).allowed) return <NotAllowed />;
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="settings" />
      <ContactSettingsForm initial={await getContactSettings()} />
    </main>
  );
}
