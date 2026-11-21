import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { linkFromEmail } from "./support/mail";

// The e2e runner points the app at a fake Claude API (tests/support/fake-anthropic.ts), so these replies are canned.

async function account(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const req = ctx.request;
  expect(
    (await req.post("/api/auth/signup", { data: { name: "AI Person", email, password: "a strong password" } })).ok(),
  ).toBe(true);
  const token = new URL(await linkFromEmail(email, /Confirm/, "/verify-email")).searchParams.get("token");
  expect((await req.post("/api/auth/verify", { data: { token } })).ok()).toBe(true);
  return { ctx, req };
}
async function noSeriousAxe(page: Page) {
  await expect(page).toHaveTitle(/\S/);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
}

test("drafts a survey with AI, checks its wording and reads a pasted questionnaire with AI", async ({
  browser,
}, info) => {
  const { ctx } = await account(browser, `ai-draft-${info.project.name}-${Date.now().toString(36)}@example.com`);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/surveys/new");
  await page.getByRole("button", { name: "Create survey with AI" }).click();
  await expect(page.locator(".errs")).toHaveText("Describe what you want to find out in a sentence or two.");
  await page.getByRole("textbox", { name: "Your goal" }).fill("Find out how useful our workshop was");
  await page.getByRole("combobox", { name: "Length" }).selectOption("6");
  await noSeriousAxe(page);
  await page.getByRole("button", { name: "Create survey with AI" }).click();
  await page.waitForURL(/\/surveys\/\w+\/edit\?drafted=3/);
  await expect(page.getByText("Drafted by AI from your description: 3 questions.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Survey title" })).toHaveValue("Workshop follow-up");

  await page.getByRole("button", { name: "Check my questions" }).click();
  await expect(page.getByText("This asks about two things at once.")).toBeVisible();
  await noSeriousAxe(page);
  await page.getByRole("button", { name: "Use this wording for Q1" }).click();
  await expect(page.getByRole("button", { name: "Wording used" })).toBeDisabled();
  await expect(page.locator(".q-list textarea, .q-list input").first()).toHaveValue(
    "How satisfied are you with the price?",
  );

  await page.goto("/surveys/import");
  await page.getByText("Or paste the questions as text").click();
  await page.getByRole("textbox", { name: "Questions" }).fill("Branch survey\nWhich branch do you use\nAccra Kumasi");
  await page.getByRole("button", { name: "Read pasted text" }).click();
  await page.getByRole("button", { name: "Read it with AI instead" }).click();
  await expect(page.getByText("Read by AI · check every question")).toBeVisible();
  await expect(page.getByText("Which branch do you use?")).toBeVisible();
  await page.getByRole("button", { name: "Create survey from these questions" }).click();
  await page.waitForURL(/\/edit\?imported=2/);
  expect(errors).toEqual([]);
});

test("the owner asks the AI analyst and writes an insight report that is saved", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now().toString(36)}`;
  const owner = await account(browser, `ai-owner-${stamp}@example.com`);
  const created = await owner.req.post("/api/surveys", {
    data: {
      title: `AI analysis ${stamp}`,
      reward: "0",
      target: 50,
      minutes: 5,
      attentionCheck: false,
      questions: [{ type: "SINGLE", text: "Was it useful?", options: ["Yes", "No"] }],
    },
  });
  const id = (await created.json()).id as string;
  expect((await owner.req.post(`/api/surveys/${id}/publish`, { data: {} })).ok()).toBe(true);
  const survey = (await (await owner.req.get(`/api/surveys/${id}`)).json()).survey;
  const html = await (await owner.req.get(`/s/${id}`)).text();
  const versionId = (html.match(/"versionId":"([a-z0-9]+)"/) ?? html.match(/versionId\\":\\"([a-z0-9]+)\\"/))![1];
  for (const i of [1, 2, 3]) {
    const p = await account(browser, `ai-p${i}-${stamp}@example.com`);
    const r = await p.req.post(`/api/surveys/${id}/responses`, {
      data: { versionId, consent: true, durationSeconds: 120, answers: { [survey.questions[0].id]: "Yes" } },
    });
    expect(r.ok(), await r.text()).toBe(true);
    await p.ctx.close();
  }

  const page = await owner.ctx.newPage();
  await page.goto(`/surveys/${id}/analyze`);
  await page.getByRole("tab", { name: "AI analyst" }).click();
  await expect(page.getByRole("heading", { name: "Ask anything about these 3 responses" })).toBeVisible();
  await page.getByRole("button", { name: "What are the three main takeaways?" }).click();
  await expect(page.getByText("Fake analyst answer. Responses analysed: 3")).toBeVisible();
  await noSeriousAxe(page);

  await page.getByRole("tab", { name: "AI report" }).click();
  await page.getByRole("button", { name: "Write my insight report" }).click();
  await expect(page.getByRole("heading", { name: "Most participants found the course useful." })).toBeVisible();
  await expect(page.getByText("Keep the practical sessions")).toBeVisible();
  await noSeriousAxe(page);
  await page.reload();
  await page.getByRole("tab", { name: "AI report" }).click();
  await expect(page.getByRole("heading", { name: "Most participants found the course useful." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Write a new report" })).toBeVisible();
});
