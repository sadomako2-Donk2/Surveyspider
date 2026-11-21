import "server-only";
import type { PrismaClient, Role, User } from "@/generated/prisma/client";
import { authConfig, emailEnabled, googleEnabled, OAUTH_COOKIE, RESET_MINUTES, VERIFY_HOURS } from "../config";
import { audit } from "../audit";
import { resetEmailMessage, sendInBackground, verifyEmailMessage } from "../email";
import {
  BadRequest,
  cleanEmail,
  clientIp,
  cookie,
  crossSite,
  fail,
  isHttps,
  isToken,
  json,
  parseCookies,
  randomToken,
  readJson,
  redirect,
  safeNext,
  sha256,
  trustedBase,
  validEmail,
} from "../http";
import { tooMany } from "../rate-limit";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { assertCanManage, grantAdminFromEnv, RoleError, ROLES } from "./roles";
import { clearSessionCookie, currentUser, endSession, startSession } from "./session";
import { meResponse, needsVerification, publicUser } from "./users";

type Handler = (req: Request, db: PrismaClient) => Promise<Response>;

/** Shared error handling and the same-site check for every auth endpoint. */
export const handle =
  (fn: Handler): Handler =>
  async (req, db) => {
    if (crossSite(req)) return fail(403, "forbidden", "Cross-site requests aren't allowed.");
    try {
      return await fn(req, db);
    } catch (e) {
      if (e instanceof BadRequest) return fail(400, "invalid_argument", e.message);
      if (e instanceof RoleError) return fail(e.status, e.status === 409 ? "conflict" : "forbidden", e.message);
      console.error("Auth handler error:", e);
      return fail(500, "internal", "Something went wrong. Please try again.");
    }
  };

const TOO_MANY = (msg: string) => fail(429, "rate_limited", msg);
const clip = (v: unknown, n: number) =>
  String(v ?? "")
    .trim()
    .slice(0, n);

// ---------- email confirmation ----------

/** Creates a confirmation link (cancelling older ones) and emails it. Returns false if no email can be sent. */
async function queueVerification(db: PrismaClient, req: Request, user: User): Promise<boolean> {
  const base = trustedBase(req);
  if (!emailEnabled() || !base) return false;
  const token = randomToken();
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId: user.id, purpose: "VERIFY_EMAIL" } }),
    db.authToken.create({
      data: {
        id: sha256(token),
        userId: user.id,
        purpose: "VERIFY_EMAIL",
        expiresAt: new Date(Date.now() + VERIFY_HOURS * 3600e3),
      },
    }),
  ]);
  sendInBackground(
    user.email,
    "Confirm your email for Afrimetrica",
    verifyEmailMessage(user, `${base}/verify-email?token=${token}`),
  );
  return true;
}

/** Finds a valid one-time token. Expired or unknown tokens are removed. */
async function takeToken(db: PrismaClient, raw: unknown, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  if (!isToken(raw)) return null;
  const t = await db.authToken.findUnique({ where: { id: sha256(raw) }, include: { user: true } });
  if (!t || t.purpose !== purpose) return null;
  if (t.expiresAt < new Date()) {
    await db.authToken.deleteMany({ where: { id: t.id } });
    return null;
  }
  return t;
}

// ---------- sign up, sign in, sign out ----------

export const signup = handle(async (req, db) => {
  const b = await readJson(req);
  const email = cleanEmail(b.email);
  if (!validEmail(email)) return fail(400, "invalid_argument", "Enter a valid email address.");
  if (await tooMany(db, `auth|${clientIp(req)}|${email}`, 10, 15 * 60e3))
    return TOO_MANY("Too many attempts. Wait 15 minutes and try again.");
  const problem = passwordProblem(b.password);
  if (problem) return fail(400, "invalid_argument", problem);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing)
    return fail(
      409,
      "conflict",
      existing.passwordHash
        ? "An account with this email already exists. Sign in instead."
        : "This email signs in with Google. Use Continue with Google.",
    );
  const user = await db.user.create({
    data: { email, name: clip(b.name, 80), passwordHash: await hashPassword(b.password as string) },
  });
  await audit(db, {
    actorId: user.id,
    action: "user.signup",
    entityType: "User",
    entityId: user.id,
    ip: clientIp(req),
  });
  await queueVerification(db, req, user);
  const set = await startSession(db, req, user.id);
  return json(200, { user: publicUser(user), needsVerification: needsVerification(user) }, [set]);
});

export const login = handle(async (req, db) => {
  const b = await readJson(req);
  const email = cleanEmail(b.email);
  if (!validEmail(email)) return fail(400, "invalid_argument", "Enter a valid email address.");
  if (await tooMany(db, `auth|${clientIp(req)}|${email}`, 10, 15 * 60e3))
    return TOO_MANY("Too many attempts. Wait 15 minutes and try again.");
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.passwordHash)
    return fail(401, "invalid_credentials", "This email signs in with Google. Use Continue with Google.");
  if (!user || !(await verifyPassword(String(b.password ?? ""), user.passwordHash)))
    return fail(401, "invalid_credentials", "Wrong email or password.");
  await grantAdminFromEnv(db, user);
  const set = await startSession(db, req, user.id);
  return json(200, { user: publicUser(user), needsVerification: needsVerification(user) }, [set]);
});

export const logout = handle(async (req, db) => {
  await endSession(db, req);
  return json(200, { ok: true }, [clearSessionCookie(req)]);
});

export const me = handle(async (req, db) => json(200, await meResponse(db, await currentUser(db, req))));

// ---------- email confirmation ----------

export const verifyEmail = handle(async (req, db) => {
  const b = await readJson(req);
  if (await tooMany(db, `verify-ip|${clientIp(req)}`, 30, 3600e3))
    return TOO_MANY("Too many attempts. Try again in an hour.");
  const t = await takeToken(db, b.token, "VERIFY_EMAIL");
  if (!t)
    return fail(
      400,
      "invalid_token",
      "This confirmation link has expired or has already been used. Sign in and we'll send you a new one.",
    );
  const [, user] = await db.$transaction([
    db.authToken.deleteMany({ where: { userId: t.userId, purpose: "VERIFY_EMAIL" } }),
    db.user.update({ where: { id: t.userId }, data: { emailVerifiedAt: t.user.emailVerifiedAt ?? new Date() } }),
  ]);
  await grantAdminFromEnv(db, user);
  return json(200, { ok: true, email: user.email });
});

export const resendVerification = handle(async (req, db) => {
  const user = await currentUser(db, req);
  if (!user) return fail(401, "auth_required", "Sign in first.");
  if (!needsVerification(user)) return json(200, { ok: true, already: true });
  if (await tooMany(db, `verify-send|${user.id}`, 3, 3600e3))
    return TOO_MANY("We've already sent several emails. Check your spam folder, or try again in an hour.");
  if (!(await queueVerification(db, req, user)))
    return fail(503, "unavailable", "Confirmation emails can't be sent right now.");
  return json(200, { ok: true });
});

// ---------- forgotten password ----------

export const forgotPassword = handle(async (req, db) => {
  const b = await readJson(req);
  const email = cleanEmail(b.email);
  if (!validEmail(email)) return fail(400, "invalid_argument", "Enter a valid email address.");
  if (!emailEnabled())
    return fail(
      503,
      "unavailable",
      "Password reset emails aren't switched on yet. Use Continue with Google, or contact us.",
    );
  const base = trustedBase(req);
  if (!base) return fail(503, "unavailable", "Password reset isn't configured on this server (set PUBLIC_URL).");
  if (await tooMany(db, `forgot-ip|${clientIp(req)}`, 10, 3600e3))
    return TOO_MANY("Too many reset requests. Try again in an hour.");
  const user = await db.user.findUnique({ where: { email } });
  // Same answer whether or not the account exists, and the email goes out in the background,
  // so this form can't be used to find out who has an account.
  if (user && !(await tooMany(db, `forgot|${email}`, 3, 3600e3))) {
    const token = randomToken();
    await db.$transaction([
      db.authToken.deleteMany({ where: { userId: user.id, purpose: "RESET_PASSWORD" } }),
      db.authToken.create({
        data: {
          id: sha256(token),
          userId: user.id,
          purpose: "RESET_PASSWORD",
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60e3),
        },
      }),
    ]);
    sendInBackground(
      user.email,
      "Reset your Afrimetrica password",
      resetEmailMessage(user, `${base}/reset-password?token=${token}`),
    );
  }
  return json(200, { ok: true });
});

export const resetPassword = handle(async (req, db) => {
  const b = await readJson(req);
  if (await tooMany(db, `reset-ip|${clientIp(req)}`, 20, 3600e3))
    return TOO_MANY("Too many attempts. Try again in an hour.");
  const t = await takeToken(db, b.token, "RESET_PASSWORD");
  if (!t) return fail(400, "invalid_token", "This reset link has expired or has already been used. Ask for a new one.");
  const problem = passwordProblem(b.password);
  if (problem) return fail(400, "invalid_argument", problem); // the link stays valid so they can try again
  const passwordHash = await hashPassword(b.password as string);
  const [, , user] = await db.$transaction([
    db.authToken.deleteMany({ where: { userId: t.userId, purpose: "RESET_PASSWORD" } }),
    db.session.deleteMany({ where: { userId: t.userId } }), // sign out everywhere else
    // the reset link proved they own the address
    db.user.update({
      where: { id: t.userId },
      data: { passwordHash, emailVerifiedAt: t.user.emailVerifiedAt ?? new Date() },
    }),
  ]);
  await audit(db, {
    actorId: user.id,
    action: "user.password_reset",
    entityType: "User",
    entityId: user.id,
    ip: clientIp(req),
  });
  await grantAdminFromEnv(db, user);
  const set = await startSession(db, req, user.id);
  return json(200, { user: publicUser(user) }, [set]);
});

// ---------- Google sign-in (OAuth 2.0 authorization code flow) ----------

const googleRedirectUri = (req: Request) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return `${trustedBase(req) ?? `${isHttps(req) ? "https" : "http"}://${host}`}/auth/google/callback`;
};
const signinError = (code: string) => redirect(`/signin?error=${code}`);

export const googleStart = handle(async (req) => {
  if (!googleEnabled()) return signinError("google_off");
  const c = authConfig();
  const state = randomToken();
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const q = new URLSearchParams({
    client_id: c.googleId,
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return redirect(`${c.googleAuthUrl}?${q}`, [cookie(req, OAUTH_COOKIE, `${state}|${next}`, 600, "/auth")]);
});

interface IdClaims {
  iss?: string;
  aud?: string;
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

export const googleCallback = handle(async (req, db) => {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const [savedState, next] = (parseCookies(req.headers.get("cookie"))[OAUTH_COOKIE] ?? "").split("|");
  if (!googleEnabled() || !isToken(state) || savedState !== state || !code) return signinError("google_failed");
  const clear = cookie(req, OAUTH_COOKIE, "", 0, "/auth");
  const c = authConfig();
  try {
    const r = await fetch(c.googleTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: c.googleId,
        client_secret: c.googleSecret,
        redirect_uri: googleRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });
    const tok = (await r.json()) as { id_token?: string };
    if (!r.ok || !tok.id_token) throw new Error(`token exchange failed: ${r.status}`);
    // The ID token came straight from Google's token endpoint over HTTPS, in exchange for our client secret,
    // so its claims can be read directly (OpenID Connect Core 3.1.3.7).
    const claims = JSON.parse(Buffer.from(tok.id_token.split(".")[1] ?? "", "base64url").toString("utf8")) as IdClaims;
    if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss ?? "") || claims.aud !== c.googleId)
      throw new Error("ID token was not issued for this site");
    if (!claims.exp || claims.exp * 1000 < Date.now() || !claims.sub) throw new Error("ID token expired or incomplete");
    if (claims.email_verified !== true && claims.email_verified !== "true")
      return redirect("/signin?error=google_email", [clear]);
    const email = cleanEmail(claims.email);
    if (!validEmail(email)) throw new Error("ID token has no usable email");

    let user = await db.user.findUnique({ where: { googleSubject: claims.sub } });
    if (!user) {
      const byEmail = await db.user.findUnique({ where: { email } });
      if (byEmail?.googleSubject) return redirect("/signin?error=google_conflict", [clear]);
      user = byEmail
        ? await db.user.update({
            where: { id: byEmail.id },
            data: {
              googleSubject: claims.sub,
              emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
              name: byEmail.name || clip(claims.name, 80),
            },
          })
        : await db.user.create({
            data: { email, name: clip(claims.name, 80), googleSubject: claims.sub, emailVerifiedAt: new Date() },
          });
      if (!byEmail)
        await audit(db, {
          actorId: user.id,
          action: "user.signup_google",
          entityType: "User",
          entityId: user.id,
          ip: clientIp(req),
        });
    }
    await grantAdminFromEnv(db, user);
    const set = await startSession(db, req, user.id);
    return redirect(`${safeNext(next)}?signed_in=google`, [clear, set]);
  } catch (e) {
    console.error("Google sign-in error:", e instanceof Error ? e.message : e);
    return redirect("/signin?error=google_failed", [clear]);
  }
});

// ---------- organisation members ----------

async function verifiedUser(db: PrismaClient, req: Request) {
  const u = await currentUser(db, req);
  if (!u) return { error: fail(401, "auth_required", "Sign in first.") };
  if (needsVerification(u))
    return { error: fail(403, "verify_required", `Confirm your email address first. We sent a link to ${u.email}.`) };
  return { user: u };
}

const parseRole = (v: unknown): Role => {
  if (typeof v !== "string" || !ROLES.includes(v as Role))
    throw new BadRequest(`Role must be one of ${ROLES.join(", ")}.`);
  return v as Role;
};

export const listMembers = (slug: string) =>
  handle(async (req, db) => {
    const { user, error } = await verifiedUser(db, req);
    if (error) return error;
    const org = await db.organisation.findUnique({ where: { slug } });
    if (!org) return fail(404, "not_found", "Organisation not found.");
    const mine = await db.membership.findUnique({
      where: { userId_organisationId: { userId: user.id, organisationId: org.id } },
    });
    if (!mine || (mine.role !== "OWNER" && mine.role !== "ADMIN"))
      return fail(403, "forbidden", "Only organisation admins and owners can see the member list.");
    const members = await db.membership.findMany({
      where: { organisationId: org.id },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return json(200, {
      organisation: { slug: org.slug, name: org.name },
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
      })),
    });
  });

export const addMember = (slug: string) =>
  handle(async (req, db) => {
    const { user, error } = await verifiedUser(db, req);
    if (error) return error;
    const b = await readJson(req);
    const role = parseRole(b.role ?? "MEMBER");
    const org = await db.organisation.findUnique({ where: { slug } });
    if (!org) return fail(404, "not_found", "Organisation not found.");
    await assertCanManage(db, user.id, org.id, null, role);
    const email = cleanEmail(b.email);
    const target = validEmail(email) ? await db.user.findUnique({ where: { email } }) : null;
    if (!target) return fail(404, "not_found", "There's no account with that email. Ask them to sign up first.");
    const exists = await db.membership.findUnique({
      where: { userId_organisationId: { userId: target.id, organisationId: org.id } },
    });
    if (exists) return fail(409, "conflict", "That person is already a member.");
    const m = await db.membership.create({ data: { userId: target.id, organisationId: org.id, role } });
    await audit(db, {
      actorId: user.id,
      organisationId: org.id,
      action: "membership.add",
      entityType: "Membership",
      entityId: m.id,
      metadata: { userId: target.id, role },
      ip: clientIp(req),
    });
    return json(200, { id: m.id, role });
  });

async function loadMembership(db: PrismaClient, slug: string, id: string) {
  const m = await db.membership.findUnique({ where: { id }, include: { organisation: true } });
  return m && m.organisation.slug === slug ? m : null;
}

export const updateMember = (slug: string, id: string) =>
  handle(async (req, db) => {
    const { user, error } = await verifiedUser(db, req);
    if (error) return error;
    const role = parseRole((await readJson(req)).role);
    const m = await loadMembership(db, slug, id);
    if (!m) return fail(404, "not_found", "Member not found.");
    await assertCanManage(db, user.id, m.organisationId, { userId: m.userId, role: m.role }, role);
    await db.membership.update({ where: { id }, data: { role } });
    await audit(db, {
      actorId: user.id,
      organisationId: m.organisationId,
      action: "membership.role",
      entityType: "Membership",
      entityId: id,
      metadata: { userId: m.userId, from: m.role, to: role },
      ip: clientIp(req),
    });
    return json(200, { id, role });
  });

export const removeMember = (slug: string, id: string) =>
  handle(async (req, db) => {
    const { user, error } = await verifiedUser(db, req);
    if (error) return error;
    const m = await loadMembership(db, slug, id);
    if (!m) return fail(404, "not_found", "Member not found.");
    await assertCanManage(db, user.id, m.organisationId, { userId: m.userId, role: m.role }, null);
    await db.membership.delete({ where: { id } });
    await audit(db, {
      actorId: user.id,
      organisationId: m.organisationId,
      action: m.userId === user.id ? "membership.leave" : "membership.remove",
      entityType: "Membership",
      entityId: id,
      metadata: { userId: m.userId, role: m.role },
      ip: clientIp(req),
    });
    return json(204, null);
  });
