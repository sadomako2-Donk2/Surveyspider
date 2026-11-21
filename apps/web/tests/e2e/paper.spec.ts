import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import path from "node:path";
import { DEFAULT_INPUTS, f2fQuote } from "../../src/lib/fieldwork";
import { linkFromEmail } from "./support/mail";

const usd0 = (x: number) => `US$${Math.round(x).toLocaleString("en-US")}`;

test("a visitor prices face-to-face fieldwork and sends a request; an admin handles it", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/surveys/paper");
  await expect(page.getByRole("heading", { name: "Your quote appears here" })).toBeVisible();

  await page.getByRole("spinbutton", { name: "Minutes per interview" }).fill("20");
  await expect(page.getByTestId("quote-total")).toHaveText(
    usd0(f2fQuote({ ...DEFAULT_INPUTS, minutes: 20 }, null).total),
  );
  await expect(page).toHaveTitle(/\S/);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  await page.getByRole("spinbutton", { name: "Minutes per interview" }).fill("");
  await page
    .getByLabel("Choose a questionnaire file")
    .setInputFiles(path.join(import.meta.dirname, "..", "fixtures", "customer-feedback.docx"));
  await expect(page.getByRole("heading", { name: "Customer Feedback Questionnaire" })).toBeVisible();
  await expect(page.getByText(/estimated from \d+ questions/)).toBeAttached();

  await page.getByRole("combobox", { name: "How should we collect the data?" }).selectOption("fgd");
  await expect(page.getByRole("spinbutton", { name: "Number of groups" })).toHaveValue("4");
  await expect(page.locator(".quote-table")).toContainText("Moderator per group");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download quote (Excel)" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("afrimetrica-fieldwork-quote.xlsx");

  await page.getByRole("button", { name: "Request this fieldwork" }).click();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.locator(".errs")).toHaveText(
    "Enter your name. Enter a valid email address. Tick the box so we can contact you.",
  );
  const client = `Clinic Lead ${info.project.name} ${Date.now().toString(36)}`;
  await page.getByLabel("Your name").fill(client);
  await page.getByLabel("Email").fill(`clinic-${info.project.name}@example.org`);
  await page.getByLabel("You can contact me about this quote.").check();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/Request Q-[0-9A-F]{6} sent/)).toBeVisible();
  expect(errors).toEqual([]);

  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  const email = `e2e-fw-admin-${info.project.name}@example.com`;
  await admin.goto("/signup?next=/admin/fieldwork");
  await admin.getByLabel("Your name").fill("Field Admin");
  await admin.getByLabel("Email").fill(email);
  await admin.getByLabel("Password").fill("a strong password");
  await admin.getByRole("button", { name: "Create account" }).click();
  await admin.waitForURL((u) => !u.pathname.startsWith("/signup"));
  await admin.goto(await linkFromEmail(email, /Confirm/, "/verify-email"));
  await expect(admin.getByRole("heading", { name: /all set/ })).toBeVisible(); // the page confirms the address after it loads
  await admin.goto("/admin/fieldwork");
  const row = admin.getByRole("row", { name: new RegExp(client) });
  await expect(row).toContainText("Focus group discussions");
  await expect(row).toContainText("32 participants");
  const [res] = await Promise.all([
    admin.waitForResponse((r) => r.url().includes("/api/admin/fieldwork/") && r.request().method() === "PATCH"),
    row.getByRole("combobox").selectOption("CONTACTED"),
  ]);
  expect(res.status()).toBe(200);
});
