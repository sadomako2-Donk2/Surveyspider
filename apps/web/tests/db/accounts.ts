import { randomBytes, createHash } from "node:crypto";
import { db, uniq } from "./helpers";
import { browser } from "./fakes";

let ip = 0;
/** Creates an account (confirmed unless told otherwise), signs it in and returns a browser for it. */
export async function signedIn(opts: { email?: string; name?: string; verified?: boolean; siteAdmin?: boolean } = {}) {
  const email = (opts.email ?? `${uniq("person")}@example.com`).toLowerCase();
  const user = await db.user.create({
    data: { email, name: opts.name ?? "Test Person", emailVerifiedAt: opts.verified === false ? null : new Date() },
  });
  if (opts.siteAdmin) {
    const org = await db.organisation.upsert({
      where: { slug: "afrimetrica" },
      update: {},
      create: { slug: "afrimetrica", name: "Afrimetrica" },
    });
    await db.membership.create({ data: { userId: user.id, organisationId: org.id, role: "ADMIN" } });
  }
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      id: createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      expiresAt: new Date(Date.now() + 864e5),
    },
  });
  const b = browser(`10.20.${Math.floor(++ip / 250)}.${ip % 250}`);
  b.jar.afri_session = token;
  return Object.assign(b, { user });
}
