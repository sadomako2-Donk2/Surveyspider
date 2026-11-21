import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Browser } from "@playwright/test";
import { linkFromEmail } from "./support/mail";

const agree = ["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"];

/** A confirmed account in its own browser context, signed in through the site's own API. */
async function account(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const req = ctx.request;
  expect(
    (
      await req.post("/api/auth/signup", { data: { name: "Analysis Person", email, password: "a strong password" } })
    ).ok(),
  ).toBe(true);
  const token = new URL(await linkFromEmail(email, /Confirm/, "/verify-email")).searchParams.get("token");
  expect((await req.post("/api/auth/verify", { data: { token } })).ok()).toBe(true);
  return { ctx, req };
}
async function answer(req: APIRequestContext, surveyId: string, versionId: string, answers: Record<string, unknown>) {
  const r = await req.post(`/api/surveys/${surveyId}/responses`, {
    data: { versionId, consent: true, durationSeconds: 240, answers },
  });
  expect(r.ok(), await r.text()).toBe(true);
}

test("the owner analyses answers; small groups stay hidden; administrators see totals only", async ({
  browser,
}, info) => {
  const p = info.project.name,
    stamp = `${p}-${Date.now().toString(36)}`;
  const owner = await account(browser, `analysis-owner-${stamp}@example.com`);
  const created = await owner.req.post("/api/surveys", {
    data: {
      title: `Course feedback ${stamp}`,
      reward: "0",
      target: 50,
      minutes: 5,
      attentionCheck: false,
      questions: [
        { type: "LIKERT", text: "The course was useful.", options: agree },
        { type: "LIKERT", text: "I can apply what I learned.", options: agree },
        {
          type: "RATING",
          text: "How likely are you to recommend the course?",
          scale: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" },
        },
        { type: "SINGLE", text: "How did you attend?", options: ["In person", "Online"] },
      ],
    },
  });
  const id = (await created.json()).id as string;
  expect((await owner.req.post(`/api/surveys/${id}/publish`, { data: {} })).ok()).toBe(true);
  const survey = (await (await owner.req.get(`/api/surveys/${id}`)).json()).survey;
  const [useful, apply, nps, mode] = survey.questions.map((q: { id: string }) => q.id);

  // Seven participants: three in Ghana (high scores), three in Kenya (low), one alone in Togo.
  const people: [string, number, number, string][] = [
    ["Ghana", 5, 10, "In person"],
    ["Ghana", 5, 9, "In person"],
    ["Ghana", 4, 9, "In person"],
    ["Kenya", 2, 3, "Online"],
    ["Kenya", 2, 4, "Online"],
    ["Kenya", 1, 2, "Online"],
    ["Togo", 3, 6, "Online"],
  ];
  const versionId = await liveVersionId(owner.req, id);
  for (const [i, [country, score, rec, how]] of people.entries()) {
    const a = await account(browser, `analysis-p${i}-${stamp}@example.com`);
    expect(
      (
        await a.req.put("/api/profile", {
          data: { age: 30, gender: "Woman", country: country === "Togo" ? "Other" : country, occupation: "Student" },
        })
      ).ok(),
    ).toBe(true);
    await answer(a.req, id, versionId, {
      [useful]: agree[score - 1],
      [apply]: agree[score - 1],
      [nps]: rec,
      [mode]: how,
    });
    await a.ctx.close();
  }

  const page = await owner.ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/surveys/${id}/analyze`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Course feedback ${stamp}`);
  await expect(page.getByText(/Analysing 7 responses/)).toBeVisible();
  await expect(page.locator(".insight").filter({ hasText: "Net Promoter Score" })).toContainText("-14 · Needs work"); // promoters 10, 9, 9; detractors 3, 4, 2 and 6
  await expect(page.locator(".insight").filter({ hasText: "Biggest group difference" })).toContainText(
    "Ghana vs Kenya",
  );
  await expect(
    page.locator(".q-result").filter({ hasText: "How did you attend?" }).locator(".bar-row").first(),
  ).toContainText("43%");
  await expect(page).toHaveTitle(/\S/);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  await page.getByRole("tab", { name: "Compare groups" }).click();
  await page.getByRole("combobox", { name: "Question", exact: true }).selectOption({ index: 0 });
  await page.getByRole("combobox", { name: "Split by" }).selectOption("country");
  const groups = page.locator(".bar-row .bar-label");
  await expect(groups).toHaveText(["Ghana", "Kenya"]);
  await expect(page.getByText(/1 person is in 1 group smaller than 3, so not shown/)).toBeVisible();
  await expect(page.locator(".result")).toContainText("Welch's t-test");

  await page.getByRole("tab", { name: "Key drivers" }).click();
  await expect(page.locator(".bar-row").first()).toContainText("Strong");

  await page.getByRole("tab", { name: "Statistics" }).click();
  await page.getByRole("combobox", { name: "Test", exact: true }).selectOption("crosstab");
  await page.getByRole("combobox", { name: "Rows" }).selectOption("country");
  await page.getByRole("combobox", { name: "Columns" }).selectOption({ label: "Q4. How did you attend?" });
  await expect(page.locator("table tbody tr")).toHaveCount(2);
  await expect(page.locator(".result")).toContainText("χ²");

  await page.getByRole("tab", { name: "Quality" }).click();
  await expect(page.locator("table tbody tr")).toHaveCount(7);
  await expect(page.locator("table")).not.toContainText("@example.com");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-analysis\.xlsx$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);

  // An administrator can't open the analysis, and sees counts only.
  const admin = await account(browser, `e2e-analysis-admin-${p}@example.com`);
  const ap = await admin.ctx.newPage();
  expect((await ap.goto(`/surveys/${id}/analyze`))?.status()).toBe(404);
  expect((await admin.req.get(`/api/surveys/${id}/analysis`)).status()).toBe(404);
  await ap.goto("/admin/surveys");
  const row = ap.getByRole("row", { name: new RegExp(`Course feedback ${stamp}`) });
  await expect(row).toContainText("7 / 50");
  await expect(ap.locator("main")).not.toContainText("Strongly agree");
});

/** The id of the survey's live version, as the take page uses it. */
async function liveVersionId(req: APIRequestContext, id: string): Promise<string> {
  const html = await (await req.get(`/s/${id}`)).text();
  const m = html.match(/"versionId":"([a-z0-9]+)"/) ?? html.match(/versionId\\":\\"([a-z0-9]+)\\"/);
  if (!m) throw new Error("live version id not found");
  return m[1]!;
}
