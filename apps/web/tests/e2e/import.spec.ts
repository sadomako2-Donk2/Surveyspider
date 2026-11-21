import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { linkFromEmail } from "./support/mail";

const fixture = (f: string) => path.join(import.meta.dirname, "..", "fixtures", f);

async function signUpAndConfirm(page: Page, email: string, next: string) {
  await page.goto(`/signup?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Your name").fill("Importer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signup"));
  await page.goto(await linkFromEmail(email, /Confirm/, "/verify-email"));
  await expect(page.getByRole("heading", { name: /all set/ })).toBeVisible();
}
const found = (page: Page) => page.locator("ol.found > li");
const upload = (page: Page, file: string) => page.getByLabel("Choose a questionnaire file").setInputFiles(file);

test("a Word questionnaire becomes a draft survey, and its Excel download comes back exactly", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signUpAndConfirm(page, `importer-${info.project.name}-${Date.now()}@example.com`, "/surveys/import");
  await page.goto("/surveys/import");
  await expect(page).toHaveTitle(/\S/);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  await upload(page, fixture("customer-feedback.docx"));
  await expect(page.getByRole("heading", { name: /Found \d+ questions in customer-feedback\.docx/ })).toBeVisible();
  await expect(page.locator("dl.kv")).toContainText("Customer Feedback Questionnaire");
  const rows = found(page);
  await expect(rows.filter({ hasText: "How often do you visit our store?" })).toContainText("Multiple choice");
  await expect(rows.filter({ hasText: "select all that apply" })).toContainText("Checkboxes");
  await expect(rows.filter({ hasText: "On a scale of 1 to 5" })).toContainText("Rating 1–5");
  await expect(rows.filter({ hasText: "How many people live in your household?" })).toContainText("Number");
  await expect(rows.filter({ hasText: "What could we do better?" })).toContainText("Short text");
  const count = await rows.count();

  await page.getByRole("button", { name: "Create survey from these questions" }).click();
  await expect(page.getByText(`Imported ${count} questions as a draft.`)).toBeVisible();
  await expect(page.locator("li.q-card")).toHaveCount(count);
  await expect(page.getByLabel("Survey title")).toHaveValue("Customer Feedback Questionnaire");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("customer-feedback-questionnaire-survey.xlsx");
  const xlsx = test.info().outputPath("roundtrip.xlsx");
  await download.saveAs(xlsx);

  await page.goto("/surveys/import");
  await upload(page, xlsx);
  await expect(page.getByText("Imported from an Afrimetrica Excel file")).toBeVisible();
  await expect(found(page)).toHaveCount(count);
  await expect(found(page).filter({ hasText: "On a scale of 1 to 5" })).toContainText("Rating 1–5");
  expect(errors).toEqual([]);
});

test("PDFs and pasted text are read too, and unsupported files are explained", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signUpAndConfirm(page, `importer2-${info.project.name}-${Date.now()}@example.com`, "/surveys/import");
  await page.goto("/surveys/import");
  await upload(page, fixture("questionnaire.pdf"));
  await expect(page.getByRole("heading", { name: "Found 5 questions in questionnaire.pdf" })).toBeVisible();
  await expect(found(page).filter({ hasText: "What is your year of study?" })).toContainText("Multiple choice");
  await expect(found(page).filter({ hasText: "Tick all that apply" })).toContainText("Checkboxes");
  await expect(found(page).filter({ hasText: "How many hours do you sleep" })).toContainText("Number");

  await page.getByRole("button", { name: "Upload a different file" }).click();
  await page
    .getByLabel("Choose a questionnaire file")
    .setInputFiles({ name: "old.doc", mimeType: "application/msword", buffer: Buffer.from("x") });
  await expect(page.locator(".errs")).toContainText("Older .doc files can't be read");

  await page.getByText("Or paste the questions as text").click();
  await page
    .getByLabel("Questions", { exact: true })
    .fill("1. How often do you shop online?\na) Daily\nb) Weekly\n\n2. What would make you shop more?");
  await page.getByRole("button", { name: "Read pasted text" }).click();
  await expect(page.getByRole("heading", { name: "Found 2 questions in Pasted text" })).toBeVisible();
  expect(errors).toEqual([]);
});
