// Fake Resend and Google servers for auth tests.
import http from "node:http";
import type { AddressInfo } from "node:net";

export interface Mail {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}

export async function startFakes(googleClientId: string) {
  const mails: Mail[] = [];
  const google = {
    email: "kwame@example.com",
    verified: true as boolean,
    sub: "g-777",
    name: "Kwame Boateng",
    aud: googleClientId,
  };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url === "/emails") {
        if (req.headers.authorization !== "Bearer test-resend-key") return res.writeHead(401).end("{}");
        mails.push(JSON.parse(body) as Mail);
        return res.writeHead(200, { "Content-Type": "application/json" }).end('{"id":"x"}');
      }
      if (req.url === "/token") {
        const p = new URLSearchParams(body);
        if (p.get("code") !== "ok" || p.get("client_secret") !== "test-secret")
          return res.writeHead(400, { "Content-Type": "application/json" }).end('{"error":"invalid_grant"}');
        const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
        const claims = {
          iss: "https://accounts.google.com",
          aud: google.aud,
          sub: google.sub,
          exp: Date.now() / 1000 + 3600,
          email: google.email,
          email_verified: google.verified,
          name: google.name,
        };
        return res
          .writeHead(200, { "Content-Type": "application/json" })
          .end(JSON.stringify({ id_token: [enc({}), enc(claims), "sig"].join(".") }));
      }
      res.writeHead(404).end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { mails, google, base, close: () => new Promise<void>((r) => server.close(() => r())) };
}

/** A browser with its own cookies and IP address that calls route handlers directly. */
export function browser(ip: string, host = "afrimetrica.test") {
  const jar: Record<string, string> = {};
  async function call(
    handler: (req: Request) => Promise<Response>,
    opts: { method?: string; path?: string; body?: unknown; headers?: Record<string, string> } = {},
  ) {
    const cookieHeader = Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    const req = new Request(`https://${host}${opts.path ?? "/api/x"}`, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: {
        host,
        "x-forwarded-for": ip,
        "x-forwarded-proto": "https",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const res = await handler(req);
    const setCookie = res.headers.getSetCookie();
    for (const c of setCookie) {
      const kv = c.split(";")[0]!;
      const i = kv.indexOf("=");
      const k = kv.slice(0, i),
        v = kv.slice(i + 1);
      if (/Max-Age=0/.test(c)) delete jar[k];
      else jar[k] = v;
    }
    const text = await res.text();
    const json = text ? (JSON.parse(text) as Record<string, any>) : null; // eslint-disable-line @typescript-eslint/no-explicit-any
    return { status: res.status, json, location: res.headers.get("location"), setCookie };
  }
  return { call, jar };
}
