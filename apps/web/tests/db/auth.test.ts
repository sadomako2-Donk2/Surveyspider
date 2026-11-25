import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "./helpers";
import { browser, startFakes, type Mail } from "./fakes";
import * as H from "@/server/auth/handlers";
import { fromPhase1, hashPassword, verifyPassword } from "@/server/auth/password";
import { seed } from "../../prisma/seed-lib";

const GOOGLE_ID = "test-client.apps.googleusercontent.com";
let fakes: Awaited<ReturnType<typeof startFakes>>;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function mailTo(addr: string, rx: RegExp, after = 0): Promise<Mail | undefined> {
  for (let i = 0; i < 40; i++) {
    const m = fakes.mails
      .slice(after)
      .reverse()
      .find((x) => x.to[0] === addr && rx.test(x.subject));
    if (m) return m;
    await wait(25);
  }
  return undefined;
}
const tokenIn = (m: Mail | undefined, path: string) => {
  const link = m?.text.match(/https?:\/\/\S+/)?.[0];
  return link && new URL(link).pathname === path ? new URL(link).searchParams.get("token") : null;
};
const bind = (f: (req: Request, d: typeof db) => Promise<Response>) => (req: Request) => f(req, db);
const signup = bind(H.signup),
  login = bind(H.login),
  logout = bind(H.logout),
  me = bind(H.me);
const verify = bind(H.verifyEmail),
  resend = bind(H.resendVerification),
  forgot = bind(H.forgotPassword),
  reset = bind(H.resetPassword);
const gStart = bind(H.googleStart),
  gCallback = bind(H.googleCallback);
const members = (slug: string) => ({
  list: (req: Request) => H.listMembers(slug)(req, db),
  add: (req: Request) => H.addMember(slug)(req, db),
  update: (id: string) => (req: Request) => H.updateMember(slug, id)(req, db),
  remove: (id: string) => (req: Request) => H.removeMember(slug, id)(req, db),
});

async function confirmLatest(addr: string) {
  const B = browser("10.9.9.9");
  return (
    (await B.call(verify, { body: { token: tokenIn(await mailTo(addr, /Confirm/), "/verify-email") } })).status === 200
  );
}
async function newAccount(ip: string, email: string, password = "a long password") {
  const B = browser(ip);
  const r = await B.call(signup, { body: { name: "Test Person", email, password } });
  expect(r.status).toBe(200);
  return B;
}

beforeAll(async () => {
  fakes = await startFakes(GOOGLE_ID);
  Object.assign(process.env, {
    PUBLIC_URL: "https://afrimetrica.test",
    RESEND_API_KEY: "test-resend-key",
    RESEND_API_URL: `${fakes.base}/emails`,
    EMAIL_FROM: "Afrimetrica <hello@afrimetrica.test>",
    GOOGLE_CLIENT_ID: GOOGLE_ID,
    GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_AUTH_URL: `${fakes.base}/auth`,
    GOOGLE_TOKEN_URL: `${fakes.base}/token`,
    ADMIN_EMAILS: "boss@example.com, second-boss@example.com",
  });
  await seed(db);
});
afterAll(async () => {
  await fakes.close();
  await db.$disconnect();
});
beforeEach(() => {
  process.env.PUBLIC_URL = "https://afrimetrica.test";
  process.env.RESEND_API_KEY = "test-resend-key";
});

describe("passwords", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword("correct horse 1");
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword("correct horse 1", h)).toBe(true);
    expect(await verifyPassword("correct horse 2", h)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("accepts Phase 1 password hashes unchanged", async () => {
    // Produced by Phase 1's server.mjs: scrypt(password, saltHex, 64) with Node defaults.
    const { scryptSync } = await import("node:crypto");
    const salt = "0123456789abcdef0123456789abcdef";
    const phase1 = scryptSync("phase one pass", salt, 64).toString("hex");
    expect(await verifyPassword("phase one pass", fromPhase1(salt, phase1))).toBe(true);
    expect(await verifyPassword("wrong", fromPhase1(salt, phase1))).toBe(false);
  });
});

describe("sign up and sign in", () => {
  it("validates input", async () => {
    const A = browser("10.0.0.1");
    expect((await A.call(signup, { body: { email: "a@example.com", password: "short" } })).status).toBe(400);
    expect((await A.call(signup, { body: { email: "nope", password: "longenough1" } })).status).toBe(400);
    expect((await A.call(signup, { body: "not an object" })).status).toBe(400);
  });

  it("creates an account and a secure session", async () => {
    const A = browser("10.0.0.1");
    const r = await A.call(signup, {
      body: { name: "Researcher A", email: " A@Example.com ", password: "correct horse 1" },
    });
    expect(r.status).toBe(200);
    expect(r.json!.user.email).toBe("a@example.com");
    expect(r.json!.needsVerification).toBe(true);
    expect(
      r.setCookie.some(
        (c) => /afri_session=[0-9a-f]{64}/.test(c) && /HttpOnly/.test(c) && /SameSite=Lax/.test(c) && /Secure/.test(c),
      ),
    ).toBe(true);
    const m = await A.call(me);
    expect(m.json!.user.email).toBe("a@example.com");
    expect(m.json!.user.verified).toBe(false);
    expect(m.json!.auth).toEqual({ google: true, emailReset: true });
  });

  it("stores only a hash of the session token", async () => {
    const A = browser("10.0.0.2");
    await A.call(signup, { body: { email: "hashcheck@example.com", password: "hash check 1" } });
    const sessions = await db.session.findMany({ where: { user: { email: "hashcheck@example.com" } } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).not.toBe(A.jar.afri_session);
    expect(sessions[0]!.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("refuses duplicate accounts", async () => {
    const r = await browser("10.0.0.3").call(signup, { body: { email: "a@example.com", password: "another pass 1" } });
    expect(r.status).toBe(409);
    expect(r.json!.message).toMatch(/already exists/);
  });

  it("signs in with the right password only", async () => {
    const B = browser("10.0.0.4");
    expect((await B.call(login, { body: { email: "a@example.com", password: "wrong pass" } })).status).toBe(401);
    const ok = await B.call(login, { body: { email: "A@EXAMPLE.COM", password: "correct horse 1" } });
    expect(ok.status).toBe(200);
    expect((await B.call(me)).json!.user.email).toBe("a@example.com");
  });

  it("rate-limits repeated wrong guesses", async () => {
    const C = browser("10.0.0.5");
    let limited = false;
    for (let i = 0; i < 12; i++)
      if ((await C.call(login, { body: { email: "a@example.com", password: `guess ${i}` } })).status === 429)
        limited = true;
    expect(limited).toBe(true);
  });

  it("limits guesses per account even when the address keeps changing", async () => {
    const D = browser("10.0.1.1");
    let limited = false;
    for (let i = 0; i < 32 && !limited; i++)
      limited =
        (
          await D.call(login, {
            body: { email: "target@example.com", password: `guess ${i}` },
            headers: { "X-Forwarded-For": `198.51.100.${i}` },
          })
        ).status === 429;
    expect(limited).toBe(true);
  });

  it("signs out and forgets the session", async () => {
    const A = browser("10.0.0.6");
    await A.call(login, { body: { email: "a@example.com", password: "correct horse 1" } });
    const token = A.jar.afri_session!;
    const r = await A.call(logout, { body: {} });
    expect(r.status).toBe(200);
    expect(A.jar.afri_session).toBeUndefined();
    const replay = browser("10.0.0.6");
    replay.jar.afri_session = token;
    expect((await replay.call(me)).json!.user).toBeNull();
  });

  it("refuses cross-site requests", async () => {
    const r = await browser("10.0.0.7").call(login, {
      body: { email: "a@example.com", password: "correct horse 1" },
      headers: { origin: "https://evil.example" },
    });
    expect(r.status).toBe(403);
  });

  it("ignores expired sessions", async () => {
    const A = await newAccount("10.0.0.8", "expiring@example.com");
    await db.session.updateMany({
      where: { user: { email: "expiring@example.com" } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await A.call(me)).json!.user).toBeNull();
    expect(await db.session.count({ where: { user: { email: "expiring@example.com" } } })).toBe(0);
  });
});

describe("email confirmation", () => {
  it("emails a confirmation link to the real site", async () => {
    const before = fakes.mails.length;
    await newAccount("10.1.0.1", "yaw@example.com");
    const m = await mailTo("yaw@example.com", /Confirm your email/, before);
    expect(m).toBeDefined();
    expect(m!.from).toBe("Afrimetrica <hello@afrimetrica.test>");
    expect(m!.text.startsWith("Hi Test,")).toBe(true);
    expect(m!.text).toMatch(/https:\/\/afrimetrica\.test\/verify-email\?token=[0-9a-f]{64}/);
  });

  it("'send it again' sends a new link and the older one stops working", async () => {
    const A = await newAccount("10.1.0.2", "efua@example.com");
    const first = tokenIn(await mailTo("efua@example.com", /Confirm/), "/verify-email");
    const before = fakes.mails.length;
    expect((await A.call(resend, { body: {} })).status).toBe(200);
    const second = tokenIn(await mailTo("efua@example.com", /Confirm/, before), "/verify-email");
    expect(second).not.toBe(first);
    expect((await browser("10.1.0.3").call(verify, { body: { token: first } })).status).toBe(400);
    expect((await browser("10.1.0.3").call(verify, { body: { token: second } })).status).toBe(200);
    expect((await A.call(me)).json!.user.verified).toBe(true);
    expect((await browser("10.1.0.3").call(verify, { body: { token: second } })).status).toBe(400); // once only
  });

  it("limits resends to 3 an hour", async () => {
    const A = await newAccount("10.1.0.4", "spam@example.com");
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await A.call(resend, { body: {} })).status);
    expect(codes).toEqual([200, 200, 200, 429]);
  });

  it("refuses made-up and expired links", async () => {
    expect((await browser("10.1.0.5").call(verify, { body: { token: "f".repeat(64) } })).status).toBe(400);
    expect((await browser("10.1.0.5").call(verify, { body: { token: "../../etc" } })).status).toBe(400);
    await newAccount("10.1.0.6", "slow@example.com");
    const t = tokenIn(await mailTo("slow@example.com", /Confirm/), "/verify-email");
    await db.authToken.updateMany({
      where: { user: { email: "slow@example.com" } },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect((await browser("10.1.0.5").call(verify, { body: { token: t } })).status).toBe(400);
  });

  it("isn't required when the site can't send email", async () => {
    delete process.env.RESEND_API_KEY;
    const A = browser("10.1.0.7");
    const r = await A.call(signup, { body: { email: "noemail@example.com", password: "no email 123" } });
    expect(r.json!.needsVerification).toBe(false);
    expect((await A.call(me)).json!.auth.emailReset).toBe(false);
  });
});

describe("forgotten password", () => {
  it("gives the same answer for unknown emails and sends nothing", async () => {
    const before = fakes.mails.length;
    const r = await browser("10.2.0.1").call(forgot, { body: { email: "nobody@example.com" } });
    expect(r.status).toBe(200);
    await wait(150);
    expect(fakes.mails.length).toBe(before);
  });

  it("runs the whole reset flow safely", async () => {
    const R1 = await newAccount("10.2.0.2", "rita@example.com", "first password");
    const R2 = browser("10.2.0.3");
    await R2.call(login, { body: { email: "rita@example.com", password: "first password" } });
    const C = browser("10.2.0.4");

    let before = fakes.mails.length;
    expect((await C.call(forgot, { body: { email: "Rita@Example.com" } })).status).toBe(200);
    const mail = await mailTo("rita@example.com", /Reset/, before);
    expect(mail!.subject).toBe("Reset your Afrimetrica password");
    const oldToken = tokenIn(mail, "/reset-password");
    expect(oldToken).toMatch(/^[0-9a-f]{64}$/);

    before = fakes.mails.length;
    await C.call(forgot, { body: { email: "rita@example.com" } });
    const fresh = tokenIn(await mailTo("rita@example.com", /Reset/, before), "/reset-password");
    expect((await C.call(reset, { body: { token: oldToken, password: "new password 1" } })).status).toBe(400); // replaced
    expect((await C.call(reset, { body: { token: "f".repeat(64), password: "new password 1" } })).status).toBe(400);
    expect((await C.call(reset, { body: { token: fresh, password: "short" } })).status).toBe(400); // link still valid

    const done = await C.call(reset, { body: { token: fresh, password: "brand new password" } });
    expect(done.status).toBe(200);
    expect(done.json!.user.email).toBe("rita@example.com");
    expect(C.jar.afri_session).toBeDefined();
    expect(
      (await browser("10.2.0.5").call(login, { body: { email: "rita@example.com", password: "first password" } }))
        .status,
    ).toBe(401);
    const again = await browser("10.2.0.6").call(login, {
      body: { email: "rita@example.com", password: "brand new password" },
    });
    expect(again.status).toBe(200);
    expect(again.json!.user.verified).toBe(true); // the reset link proved they own the address
    expect((await R1.call(me)).json!.user).toBeNull(); // every other session signed out
    expect((await R2.call(me)).json!.user).toBeNull();
    expect((await C.call(reset, { body: { token: fresh, password: "another password" } })).status).toBe(400); // once only
    expect(await db.auditEvent.count({ where: { action: "user.password_reset", entityId: done.json!.user.id } })).toBe(
      1,
    );
  });

  it("sends at most 3 reset emails per address per hour", async () => {
    await newAccount("10.2.1.1", "limit@example.com");
    const before = fakes.mails.length;
    for (let i = 0; i < 5; i++) await browser(`10.2.1.${i + 2}`).call(forgot, { body: { email: "limit@example.com" } });
    await wait(200);
    expect(
      fakes.mails.slice(before).filter((m) => m.to[0] === "limit@example.com" && /Reset/.test(m.subject)).length,
    ).toBe(3);
  });

  it("never puts the request's Host into links", async () => {
    delete process.env.PUBLIC_URL;
    const r = await browser("10.2.2.1", "evil.example").call(forgot, { body: { email: "a@example.com" } });
    expect(r.status).toBe(503);
  });

  it("escapes names in email HTML", async () => {
    const before = fakes.mails.length;
    await browser("10.2.3.1").call(signup, {
      body: { name: "<script>alert(1)</script>", email: "xss@example.com", password: "xss password" },
    });
    const m = await mailTo("xss@example.com", /Confirm/, before);
    expect(m!.html).not.toMatch(/<script/i);
    expect(m!.html).toContain("&lt;script&gt;");
  });

  it("explains when reset emails are off", async () => {
    delete process.env.RESEND_API_KEY;
    expect((await browser("10.2.4.1").call(forgot, { body: { email: "a@example.com" } })).status).toBe(503);
  });
});

describe("Google sign-in", () => {
  it("redirects to Google with our client id and a state cookie", async () => {
    const G = browser("10.3.0.1");
    const r = await G.call(gStart, { path: "/auth/google?next=/training" });
    expect(r.status).toBe(302);
    const u = new URL(r.location!);
    expect(u.searchParams.get("client_id")).toBe(GOOGLE_ID);
    expect(u.searchParams.get("redirect_uri")).toBe("https://afrimetrica.test/auth/google/callback");
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(G.jar.afri_oauth).toBeDefined();
  });

  it("refuses a forged state", async () => {
    const G = browser("10.3.0.2");
    await G.call(gStart, { path: "/auth/google" });
    const r = await G.call(gCallback, { path: `/auth/google/callback?state=${"a".repeat(64)}&code=ok` });
    expect(r.location).toBe("/signin?error=google_failed");
  });

  it("signs in a new user and returns them to their page", async () => {
    const G = browser("10.3.0.3");
    const start = await G.call(gStart, { path: "/auth/google?next=/training" });
    const state = new URL(start.location!).searchParams.get("state");
    const cb = await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` });
    expect(cb.location).toBe("/training?signed_in=google");
    const m = (await G.call(me)).json!;
    expect(m.user).toMatchObject({ email: "kwame@example.com", name: "Kwame Boateng", google: true, verified: true });
    expect(G.jar.afri_oauth).toBeUndefined();
  });

  it("can't be replayed with the same state", async () => {
    const G = browser("10.3.0.4");
    const start = await G.call(gStart, { path: "/auth/google" });
    const state = new URL(start.location!).searchParams.get("state");
    await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` });
    const again = await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` });
    expect(again.location).toBe("/signin?error=google_failed");
  });

  it("links to an existing email account and confirms it", async () => {
    await newAccount("10.3.1.1", "linked@example.com");
    Object.assign(fakes.google, { email: "linked@example.com", sub: "g-linked" });
    const G = browser("10.3.1.2");
    const state = new URL((await G.call(gStart, { path: "/auth/google" })).location!).searchParams.get("state");
    await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` });
    expect((await G.call(me)).json!.user).toMatchObject({
      email: "linked@example.com",
      google: true,
      password: true,
      verified: true,
    });
  });

  it("refuses Google accounts with unverified emails", async () => {
    Object.assign(fakes.google, { email: "unverified@example.com", sub: "g-unv", verified: false });
    const G = browser("10.3.2.1");
    const state = new URL((await G.call(gStart, { path: "/auth/google" })).location!).searchParams.get("state");
    expect((await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` })).location).toBe(
      "/signin?error=google_email",
    );
    Object.assign(fakes.google, { verified: true });
  });

  it("refuses ID tokens issued for another site", async () => {
    Object.assign(fakes.google, { email: "other@example.com", sub: "g-other", aud: "someone-else" });
    const G = browser("10.3.3.1");
    const state = new URL((await G.call(gStart, { path: "/auth/google" })).location!).searchParams.get("state");
    expect((await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` })).location).toBe(
      "/signin?error=google_failed",
    );
    Object.assign(fakes.google, { aud: GOOGLE_ID });
  });

  it("ignores unsafe 'next' destinations", async () => {
    const G = browser("10.3.4.1");
    Object.assign(fakes.google, { email: "kwame@example.com", sub: "g-777" });
    const start = await G.call(gStart, { path: "/auth/google?next=//evil.example/x" });
    const state = new URL(start.location!).searchParams.get("state");
    expect((await G.call(gCallback, { path: `/auth/google/callback?state=${state}&code=ok` })).location).toBe(
      "/account?signed_in=google",
    );
  });

  it("explains when Google sign-in is off", async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    expect((await browser("10.3.5.1").call(gStart, { path: "/auth/google" })).location).toBe(
      "/signin?error=google_off",
    );
    process.env.GOOGLE_CLIENT_ID = saved;
  });
});

describe("site administrators and organisation roles", () => {
  it("makes ADMIN_EMAILS accounts admins only after the email is confirmed", async () => {
    const Boss = await newAccount("10.4.0.1", "boss@example.com", "owner password");
    expect((await Boss.call(me)).json!.isSiteAdmin).toBe(false);
    expect(await confirmLatest("boss@example.com")).toBe(true);
    expect((await Boss.call(me)).json!.isSiteAdmin).toBe(true);
    expect((await Boss.call(me)).json!.memberships).toEqual([
      { organisation: { slug: "afrimetrica", name: "Afrimetrica" }, role: "ADMIN" },
    ]);
    expect(await db.auditEvent.count({ where: { action: "membership.grant_from_env" } })).toBeGreaterThan(0);
  });

  it("enforces who can manage members", async () => {
    const org = await db.organisation.create({ data: { slug: "acme-research", name: "Acme Research" } });
    const accounts: Record<string, ReturnType<typeof browser>> = {};
    for (const [who, role] of [
      ["owner", "OWNER"],
      ["admin", "ADMIN"],
      ["analyst", "ANALYST"],
      ["member", "MEMBER"],
    ] as const) {
      accounts[who] = await newAccount(`10.5.0.${who.length}`, `${who}@acme.example`);
      await confirmLatest(`${who}@acme.example`);
      const u = await db.user.findUniqueOrThrow({ where: { email: `${who}@acme.example` } });
      await db.membership.create({ data: { userId: u.id, organisationId: org.id, role } });
    }
    await newAccount("10.5.1.1", "newbie@acme.example");
    const M = members("acme-research");
    const { owner, admin, analyst, member } = accounts as Record<string, ReturnType<typeof browser>>;

    expect((await analyst!.call(M.list)).status).toBe(403);
    const list = await admin!.call(M.list);
    expect(list.status).toBe(200);
    expect(list.json!.members.map((m: { role: string }) => m.role)).toEqual(["OWNER", "ADMIN", "ANALYST", "MEMBER"]);
    const id = (role: string) => list.json!.members.find((m: { role: string }) => m.role === role).id as string;

    expect((await member!.call(M.add, { body: { email: "newbie@acme.example", role: "MEMBER" } })).status).toBe(403);
    expect((await admin!.call(M.add, { body: { email: "newbie@acme.example", role: "ADMIN" } })).status).toBe(403);
    expect((await admin!.call(M.add, { body: { email: "nobody@acme.example", role: "MEMBER" } })).status).toBe(404);
    expect((await admin!.call(M.add, { body: { email: "newbie@acme.example", role: "WIZARD" } })).status).toBe(400);
    const added = await admin!.call(M.add, { body: { email: "newbie@acme.example", role: "ANALYST" } });
    expect(added.status).toBe(200);
    expect((await admin!.call(M.add, { body: { email: "newbie@acme.example", role: "MEMBER" } })).status).toBe(409);

    expect((await admin!.call(M.update(id("MEMBER")), { method: "PATCH", body: { role: "ANALYST" } })).status).toBe(
      200,
    );
    expect((await admin!.call(M.update(id("OWNER")), { method: "PATCH", body: { role: "MEMBER" } })).status).toBe(403);
    expect((await owner!.call(M.update(id("OWNER")), { method: "PATCH", body: { role: "ADMIN" } })).status).toBe(409); // last owner
    expect((await owner!.call(M.update(id("ADMIN")), { method: "PATCH", body: { role: "OWNER" } })).status).toBe(200);
    expect((await owner!.call(M.update(id("OWNER")), { method: "PATCH", body: { role: "ADMIN" } })).status).toBe(200); // now there are two

    expect((await analyst!.call(M.remove(added.json!.id), { method: "DELETE" })).status).toBe(403);
    expect((await analyst!.call(M.remove(id("ANALYST")), { method: "DELETE" })).status).toBe(204); // leaving is always allowed
    expect((await member!.call(M.list)).status).toBe(403);
    expect((await browser("10.5.9.9").call(M.list)).status).toBe(401);
    expect((await owner!.call(members("no-such-org").list)).status).toBe(404);
    expect(
      await db.auditEvent.count({ where: { organisationId: org.id, action: { startsWith: "membership." } } }),
    ).toBe(5); // add, 3 role changes, leave
  });

  it("requires a confirmed email to manage members", async () => {
    const U = await newAccount("10.5.2.1", "unconfirmed-admin@acme.example");
    const r = await U.call(members("acme-research").list);
    expect(r.status).toBe(403);
    expect(r.json!.code).toBe("verify_required");
  });
});

describe("concurrency", () => {
  it("creates the Afrimetrica organisation once when several admins confirm at the same moment", async () => {
    const { afrimetricaOrg } = await import("@/server/auth/roles");
    await db.organisation.deleteMany({ where: { slug: "afrimetrica", memberships: { none: {} } } });
    const orgs = await Promise.all(Array.from({ length: 8 }, () => afrimetricaOrg(db)));
    expect(new Set(orgs.map((o) => o.id)).size).toBe(1);
  });
});

describe("email confirmation limits", () => {
  it("doesn't block a room of people confirming from one shared connection, but stops guessing", async () => {
    const office = "10.77.0.1";
    for (let i = 0; i < 35; i++) {
      const email = `office-${i}-${Date.now()}@example.com`;
      const before = fakes.mails.length;
      await browser(`10.77.1.${i}`).call(signup, { body: { email, password: "office password 1" } });
      const t = tokenIn(await mailTo(email, /Confirm/, before), "/verify-email");
      expect((await browser(office).call(verify, { body: { token: t } })).status).toBe(200);
    }
    const guesser = browser("10.77.0.2");
    const codes = [];
    for (let i = 0; i < 32; i++)
      codes.push((await guesser.call(verify, { body: { token: i.toString(16).padStart(64, "0") } })).status);
    expect(codes.slice(0, 30).every((c) => c === 400)).toBe(true);
    expect(codes.slice(30)).toEqual([429, 429]);
  });
});
