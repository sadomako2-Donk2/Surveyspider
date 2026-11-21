import "server-only";

// Read on every call (not at import time) so tests and Render's dashboard changes take effect without code changes.
export function authConfig() {
  const env = process.env;
  const list = (v?: string) =>
    (v ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
  const url = (v?: string) => (v ? v.replace(/\/+$/, "") : "");
  return {
    publicUrl: url(env.PUBLIC_URL) || url(env.RENDER_EXTERNAL_URL),
    resendKey: env.RESEND_API_KEY ?? "",
    resendUrl: env.RESEND_API_URL || "https://api.resend.com/emails",
    emailFrom: env.EMAIL_FROM || "Afrimetrica <onboarding@resend.dev>",
    googleId: env.GOOGLE_CLIENT_ID ?? "",
    googleSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    googleAuthUrl: env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth",
    googleTokenUrl: env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token",
    adminEmails: list(env.ADMIN_EMAILS),
  };
}

export const SESSION_DAYS = 30;
export const VERIFY_HOURS = 48;
export const RESET_MINUTES = 60;
export const SESSION_COOKIE = "afri_session";
export const OAUTH_COOKIE = "afri_oauth";

export const emailEnabled = () => !!authConfig().resendKey;
export const googleEnabled = () => {
  const c = authConfig();
  return !!(c.googleId && c.googleSecret);
};
