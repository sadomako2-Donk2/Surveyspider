// A stand-in for the Claude API, so tests exercise the real SDK code path without network calls or spend.
// Point ANTHROPIC_BASE_URL at it. It answers POST /v1/messages with a streamed reply.
import http from "node:http";
import type { AddressInfo } from "node:net";

export type FakeReply =
  { text: string; stop?: "end_turn" | "max_tokens" | "refusal" } | { status: number; type: string; message: string };
export interface FakeRequest {
  headers: http.IncomingHttpHeaders;
  body: {
    model: string;
    messages: { role: string; content: string }[];
    system?: string;
    output_config?: unknown;
    fallbacks?: unknown;
  };
}

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** Default replies, chosen from the prompt, used by the browser tests. */
export function defaultReply(req: FakeRequest): FakeReply {
  const prompt = req.body.messages.map((m) => m.content).join("\n");
  if (prompt.includes("expert survey designer"))
    return {
      text: JSON.stringify({
        title: "Workshop follow-up",
        description: "Tell us how the workshop helped. Your answers are anonymous.",
        minutes: 4,
        questions: [
          { type: "likert", text: "The workshop was useful for my work.", options: ["Disagree", "Neutral", "Agree"] },
          {
            type: "rating",
            text: "How likely are you to recommend the workshop?",
            options: [],
            scale: { min: 0, max: 10, minLabel: "Not at all likely", maxLabel: "Extremely likely" },
          },
          { type: "text", text: "What did you change at work afterwards?", options: [] },
        ],
      }),
    };
  if (prompt.includes("review survey questions"))
    return {
      text: JSON.stringify([
        { q: 1, issue: "This asks about two things at once.", rewrite: "How satisfied are you with the price?" },
      ]),
    };
  if (prompt.includes("convert a questionnaire document"))
    return {
      text:
        "```json\n" +
        JSON.stringify({
          title: "Read by AI",
          description: "",
          questions: [
            { type: "single", text: "Which branch do you use?", options: ["Accra", "Kumasi"] },
            { type: "text", text: "Anything else?", options: [] },
          ],
        }) +
        "\n```",
    };
  if (prompt.includes("write an insight report"))
    return {
      text: JSON.stringify({
        headline: "Most participants found the course useful.",
        summary: "Grounded summary from the fake model.",
        findings: [{ title: "Usefulness is high", detail: "From the fake model." }],
        themes: [],
        recommendations: [{ action: "Keep the practical sessions", why: "Fake evidence.", priority: "high" }],
        caveats: ["Small sample."],
      }),
    };
  if (prompt.includes("AI Research Analyst"))
    return { text: `Fake analyst answer. ${/Responses analysed: (\d+)/.exec(prompt)?.[0] ?? ""}`.trim() };
  return { text: "Fake reply." };
}

export function fakeAnthropic(reply: (req: FakeRequest) => FakeReply = defaultReply) {
  const requests: FakeRequest[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) return res.writeHead(404).end();
      const r: FakeRequest = { headers: req.headers, body: JSON.parse(raw) };
      requests.push(r);
      const out = reply(r);
      if ("status" in out)
        return res
          .writeHead(out.status, { "Content-Type": "application/json", "x-should-retry": "false" })
          .end(JSON.stringify({ type: "error", error: { type: out.type, message: out.message } }));
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const usage = { input_tokens: 10, output_tokens: 1 };
      res.write(
        sse("message_start", {
          type: "message_start",
          message: {
            id: "msg_fake",
            type: "message",
            role: "assistant",
            model: r.body.model,
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage,
          },
        }),
      );
      res.write(
        sse("content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        }),
      );
      res.write(
        sse("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: out.text },
        }),
      );
      res.write(sse("content_block_stop", { type: "content_block_stop", index: 0 }));
      res.write(
        sse("message_delta", {
          type: "message_delta",
          delta: { stop_reason: out.stop ?? "end_turn", stop_sequence: null },
          usage: { output_tokens: 5 },
        }),
      );
      res.end(sse("message_stop", { type: "message_stop" }));
    });
  });
  return {
    requests,
    server,
    async start(port = 0) {
      await new Promise<void>((ok) => server.listen(port, "127.0.0.1", ok));
      return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    },
    stop: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}
