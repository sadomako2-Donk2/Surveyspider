import type { Metadata } from "next";
import { AdminHeader, NotAllowed } from "@/components/academy/AdminNav";
import { TeamManager } from "@/components/enquiries/AdminControls";
import { getDb } from "@/lib/db";
import { adminPage } from "@/server/admin-page";

export const metadata: Metadata = { title: "Team · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Members() {
  const page = await adminPage("/admin/members");
  if (!page.allowed) return <NotAllowed />;
  const rows = await getDb().membership.findMany({
    where: { organisation: { slug: "afrimetrica" } },
    include: { user: { select: { email: true, name: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  const myRole = rows.find((r) => r.userId === page.user.id)!.role;
  return (
    <main id="main" className="wrap stack">
      <AdminHeader current="members" />
      <TeamManager
        me={page.user.id}
        myRole={myRole}
        members={rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          email: r.user.email,
          name: r.user.name,
          role: r.role,
        }))}
      />
    </main>
  );
}
