import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail } from "./support/mail";

async function noSeriousA11yIssues(page: Page) {
  await expect(page).toHaveTitle(/\S/); // pages refreshing after a save briefly have no title; scan the settled page
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(
    r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}
async function signUpAndConfirm(page: Page, email: string, next: string) {
  await page.goto(`/signup?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Your name").fill("Survey Person");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signup"));
  await page.goto(await linkFromEmail(email, /Confirm/, "/verify-email"));
  await expect(page.getByRole("heading", { name: /all set/ })).toBeVisible();
}
/** Answers every question on the take page: first option, or "Purple" for the attention check. */
async function answerAll(page: Page) {
  for (const q of await page.locator("fieldset.q-take").all()) {
    const legend = (await q.locator("legend").textContent()) ?? "";
    if (/Purple/.test(legend)) await q.getByLabel("Purple", { exact: true }).check();
    else if (await q.locator("input[type=radio]").count()) await q.locator("input[type=radio]").last().check();
    else if (await q.locator("input[type=checkbox]").count()) await q.locator("input[type=checkbox]").first().check();
    else if (await q.locator("input[type=number]").count()) await q.locator("input[type=number]").fill("3");
    else await q.locator("textarea").fill("Very practical.");
  }
}

test("build, publish, answer and review a survey", async ({ browser }, info) => {
  const p = info.project.name,
    stamp = Date.now().toString(36);
  const errors: string[] = [];

  const owner = await (await browser.newContext()).newPage();
  owner.on("pageerror", (e) => errors.push(e.message));
  await signUpAndConfirm(owner, `owner-${p}-${stamp}@example.com`, "/surveys/new");
  await owner.goto("/surveys/new");
  await owner.getByRole("link", { name: /Post-training evaluation/ }).click();
  await expect(owner.getByLabel("Survey title")).toHaveValue("Course evaluation");
  const title = `Course evaluation ${p} ${stamp}`;
  await owner.getByLabel("Survey title").fill(title);
  await owner.getByRole("button", { name: "+ Rating scale" }).click();
  const last = owner.locator("li.q-card").last();
  await last.getByRole("textbox", { name: "Question", exact: true }).fill("How confident are you now?");
  await last.getByRole("combobox", { name: "Scale" }).selectOption("0-10");
  await owner.getByLabel("Responses wanted").fill("5");
  await noSeriousA11yIssues(owner);
  await owner.getByRole("button", { name: "Save draft" }).click();
  await expect(owner.getByText("Draft saved.")).toBeVisible();
  await owner.getByRole("button", { name: "Publish survey" }).click();
  await expect(owner.getByText(/Version 1 is live/)).toBeVisible();
  const link = (await owner.locator(".copy-link code").textContent())!;
  expect(link).toMatch(/\/s\/[a-z0-9]+$/);

  const person = await (await browser.newContext()).newPage();
  person.on("pageerror", (e) => errors.push(e.message));
  await person.goto(link);
  await expect(person.getByRole("heading", { name: title })).toBeVisible();
  await signUpAndConfirm(person, `person-${p}-${stamp}@example.com`, new URL(link).pathname);
  await person.goto(link);
  await person.getByRole("button", { name: "Submit my answers" }).click();
  await expect(person.locator(".errs")).toContainText("Please answer questions");
  await answerAll(person);
  await person.getByRole("button", { name: "Submit my answers" }).click();
  await expect(person.locator(".errs")).toHaveText("Tick the consent box to take part.");
  await person.getByLabel(/I agree to take part/).check();
  await noSeriousA11yIssues(person);
  await person.getByRole("button", { name: "Submit my answers" }).click();
  await expect(person.getByRole("heading", { name: "Thank you for taking part" })).toBeVisible();
  await person.goto(link);
  await expect(person.getByRole("heading", { name: "You've already taken this survey" })).toBeVisible();

  await owner.reload();
  await expect(owner.locator(".stat").first()).toContainText("1 / 5");
  await owner.locator("details.response summary").first().click();
  await expect(owner.locator("details.response summary").first()).toContainText("P001");
  await expect(owner.locator("details.response").first()).toContainText("How confident are you now?");
  await expect(owner.locator("details.response").first()).not.toContainText(`person-${p}`);
  await noSeriousA11yIssues(owner);

  // Editing the live survey creates version 2; version 1 keeps running until it is published.
  await owner.getByRole("link", { name: "Edit survey" }).click();
  await expect(owner.getByText(/Version 1 is live/)).toBeVisible();
  await owner
    .locator("li.q-card")
    .first()
    .getByRole("textbox", { name: "Question", exact: true })
    .fill("Overall, how satisfied were you with this course?");
  await owner.getByRole("button", { name: "Save draft" }).click();
  await expect(owner.getByText("Saved as version 2. Publish it to replace the live version.")).toBeVisible();
  await owner.getByRole("button", { name: "Publish changes" }).click();
  await expect(owner.getByText("Version 2 is live. Share the link below.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("participants set up a profile and see surveys they can take", async ({ page }, info) => {
  await signUpAndConfirm(page, `panel-${info.project.name}-${Date.now()}@example.com`, "/surveys/take");
  await page.goto("/surveys/take");
  await page.getByLabel("Age", { exact: true }).fill("16");
  await page.getByLabel("Gender").selectOption("Woman");
  await page.getByLabel("Country").selectOption("Ghana");
  await page.getByLabel("Occupation").selectOption("Student");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.locator(".errs")).toHaveText("Enter an age of 18 or over.");
  await page.getByLabel("Age", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await noSeriousA11yIssues(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
