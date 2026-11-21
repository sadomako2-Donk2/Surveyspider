interface Mail {
  to: string[];
  subject: string;
  text: string;
}

/** Waits for an email from the fake email service (see scripts/e2e.ts) and returns the link in it. */
export async function linkFromEmail(to: string, subject: RegExp, path: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const mails = (await (await fetch(process.env.FAKE_MAIL_URL!)).json()) as Mail[];
    const m = mails.reverse().find((x) => x.to[0] === to && subject.test(x.subject));
    const link = m?.text.match(/https?:\/\/\S+/)?.[0];
    if (link && new URL(link).pathname === path) return link;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No ${subject} email for ${to}`);
}
