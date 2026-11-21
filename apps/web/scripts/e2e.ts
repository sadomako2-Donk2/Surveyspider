// Browser tests against the built app, with a throwaway database and a fake email service
// that the tests can read (GET /__emails). Run `npm run build` first.
import http from "node:http";
import { spawn } from "node:child_process";
import { withThrowawayDb } from "./throwaway-db";

const MAIL_PORT = 4599;
const mails: unknown[] = [];
const fakeResend = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.method === "POST" && req.url === "/emails") {
      mails.push(JSON.parse(body));
      return res.writeHead(200, { "Content-Type": "application/json" }).end('{"id":"e2e"}');
    }
    if (req.method === "GET" && req.url === "/__emails")
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(mails));
    res.writeHead(404).end();
  });
});

fakeResend.listen(MAIL_PORT, "127.0.0.1", async () => {
  let status = 1;
  try {
    // Must be async: a blocking spawnSync would freeze this process, and with it the fake email server.
    status = await withThrowawayDb(
      (url) =>
        new Promise<number>((resolve) =>
          spawn("npx", ["playwright", "test", ...process.argv.slice(2)], {
            stdio: "inherit",
            env: {
              ...process.env,
              DATABASE_URL: url,
              RESEND_API_KEY: "e2e-key",
              RESEND_API_URL: `http://127.0.0.1:${MAIL_PORT}/emails`,
              EMAIL_FROM: "Afrimetrica <test@afrimetrica.test>",
              FAKE_MAIL_URL: `http://127.0.0.1:${MAIL_PORT}/__emails`,
              PUBLIC_URL: "",
              GOOGLE_CLIENT_ID: "",
              ADMIN_EMAILS:
                "e2e-admin-desktop@example.com,e2e-admin-mobile@example.com,e2e-inbox-desktop@example.com,e2e-inbox-mobile@example.com,e2e-boss-desktop@example.com,e2e-analysis-admin-desktop@example.com,e2e-analysis-admin-mobile@example.com,e2e-fw-admin-desktop@example.com,e2e-fw-admin-mobile@example.com",
            },
          }).on("exit", (code) => resolve(code ?? 1)),
        ),
    );
  } catch (e) {
    console.error(e);
  } finally {
    fakeResend.close();
    process.exit(status);
  }
});
