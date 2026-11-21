import "server-only";
import { authConfig, RESET_MINUTES, VERIFY_HOURS } from "./config";

const escHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  const c = authConfig();
  if (!c.resendKey) throw new Error("RESEND_API_KEY is not set");
  const r = await fetch(c.resendUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: c.emailFrom, to: [to], subject, html, text }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

/** Sends without making the visitor wait; failures are logged, never shown (so emails can't reveal who has an account). */
export function sendInBackground(to: string, subject: string, body: { html: string; text: string }) {
  void sendEmail(to, subject, body.html, body.text).catch((e: unknown) =>
    console.error(`Email "${subject}" failed:`, e instanceof Error ? e.message : e),
  );
}

interface Brand {
  name?: string | null;
  paragraphs: string[];
  button: string;
  link: string;
  footer: string;
}

/** One branded layout for every Afrimetrica email, with a plain-text version. Same design as Phase 1. */
export function brandEmail({ name, paragraphs, button, link, footer }: Brand) {
  const first = name?.trim().split(/\s+/)[0] ?? "";
  const hi = first ? `Hi ${first},` : "Hi,";
  const L = escHtml(link);
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f9;font-family:Arial,Helvetica,sans-serif;color:#0e1d3a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f9;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #dde2ec;border-radius:12px">
<tr><td style="padding:28px 32px 0;font-size:22px;font-weight:800"><span style="color:#0e1d3a;letter-spacing:1px">AFRI</span><span style="color:#b88a2c;letter-spacing:1px">METRICA</span></td></tr>
<tr><td style="padding:20px 32px 6px;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">${escHtml(hi)}</p>
${paragraphs.map((x) => `<p style="margin:0 0 14px">${escHtml(x)}</p>`).join("")}</td></tr>
<tr><td style="padding:6px 32px 22px"><a href="${L}" style="display:inline-block;background:#10285a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${escHtml(button)}</a></td></tr>
<tr><td style="padding:0 32px 28px;font-size:13px;line-height:1.6;color:#56627a">
<p style="margin:0 0 10px">If the button doesn't work, copy this link into your browser:<br><a href="${L}" style="color:#10285a;word-break:break-all">${L}</a></p>
<p style="margin:0">${escHtml(footer)}</p></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${hi}\n\n${paragraphs.join("\n\n")}\n\n${button}:\n${link}\n\n${footer}\n`;
  return { html, text };
}

export const verifyEmailMessage = (user: { name: string; email: string }, link: string) =>
  brandEmail({
    name: user.name,
    paragraphs: [
      `Welcome to Afrimetrica! Please confirm that ${user.email} is your email address.`,
      `Once it's confirmed you can register for courses, launch surveys, take paid studies and use the AI features. The link works for ${VERIFY_HOURS} hours.`,
    ],
    button: "Confirm my email",
    link,
    footer: "If you didn't create an Afrimetrica account, you can ignore this email.",
  });

export const resetEmailMessage = (user: { name: string; email: string }, link: string) =>
  brandEmail({
    name: user.name,
    paragraphs: [
      `We received a request to reset the password for your Afrimetrica account (${user.email}). Click the button to choose a new one. The link works for ${RESET_MINUTES} minutes and can be used once.`,
    ],
    button: "Choose a new password",
    link,
    footer: "If you didn't ask for this, you can ignore this email. Your password won't change.",
  });
