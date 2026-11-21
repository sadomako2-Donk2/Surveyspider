import "server-only";
import { getDb } from "@/lib/db";

export interface ContactSettings {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  hours?: string;
  linkedin?: string;
}

const str = (v: unknown, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** Contact details set by an administrator (step 6). Missing or unreadable settings simply show nothing. */
export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const row = await getDb().siteSetting.findUnique({ where: { key: "contact" } });
    const v = (row?.value ?? {}) as Record<string, unknown>;
    const linkedin = str(v.linkedin);
    return {
      email: str(v.email, 160),
      phone: str(v.phone, 40),
      whatsapp: str(v.whatsapp, 40),
      address: str(v.address),
      hours: str(v.hours, 120),
      linkedin: linkedin && /^https:\/\//.test(linkedin) ? linkedin : undefined,
    };
  } catch (e) {
    console.error("Couldn't read contact settings:", e instanceof Error ? e.message : e);
    return {};
  }
}
