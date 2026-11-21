import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail } from "./support/mail";

async function signUpAndConfirm(page: Page, name: string, email: string) {
  await page.waitForURL(/\/signup/);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signup"));
  await page.goto(await linkFromEmail(email, /Confirm/, "/verify-email"));
  await expect(page.getByRole("heading", { name: /all set/ })).toBeVisible();
}
async function noSeriousA11yIssues(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(
    r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}

test("an admin publishes a course and a visitor registers for it", async ({ browser }, info) => {
  const p = info.project.name;
  const title = `Questionnaire Design (${p} ${Date.now().toString(36)})`;
  const errors: string[] = [];

  // --- administrator creates and publishes a course from a template ---
  const admin = await (await browser.newContext()).newPage();
  admin.on("pageerror", (e) => errors.push(e.message));
  await admin.goto("/signup?next=/admin/courses");
  await signUpAndConfirm(admin, "Site Admin", `e2e-admin-${p}@example.com`);
  await admin.goto("/admin/courses");
  await expect(admin.getByRole("heading", { name: "Admin area" })).toBeVisible();
  await admin.getByLabel("Start from").selectOption({ label: "Questionnaire Design and Survey Methods" });
  await admin.getByRole("button", { name: "New course" }).click();
  await expect(admin.getByLabel("Course title")).toHaveValue("Questionnaire Design and Survey Methods");
  expect((await admin.getByLabel("Learning outcomes, one per line").inputValue()).split("\n")).toHaveLength(4);
  await admin.getByLabel("Course title").fill(title);
  await admin.getByRole("button", { name: "+ Add a date" }).click();
  await admin.getByLabel("Start").fill("2099-02-10");
  await admin.getByLabel("End").fill("2099-02-11");
  await admin.getByLabel("Venue or link").fill("Accra");
  await admin.getByLabel("Seats (0 = no limit)").fill("2");
  await admin.getByLabel("Fee", { exact: true }).fill("1200");
  await admin.getByLabel("Currency").selectOption("GHS");
  await admin.getByLabel("Status").selectOption("PUBLISHED");
  await noSeriousA11yIssues(admin);
  await admin.getByRole("button", { name: "Save course" }).click();
  await expect(admin.getByText("Course created.")).toBeVisible();

  // --- a visitor finds it and registers ---
  const visitor = await (await browser.newContext()).newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto("/training");
  await visitor.getByRole("link", { name: title }).click();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(visitor.getByText("10 Feb 2099 – 11 Feb 2099")).toBeVisible();
  await expect(visitor.getByText("Accra · GH₵1,200 · 2 seats left")).toBeVisible();
  await noSeriousA11yIssues(visitor);
  await visitor.getByRole("link", { name: "Sign in to register", exact: true }).click();
  await visitor.getByRole("link", { name: "Create a free account" }).click();
  const email = `yaw-${p}-${Date.now()}@example.com`;
  await signUpAndConfirm(visitor, "Yaw Owusu", email);
  await visitor.goto("/training");
  await visitor.getByRole("link", { name: title }).click();
  await visitor.getByRole("button", { name: "Register", exact: true }).click();
  await visitor.getByRole("button", { name: "Register", exact: true }).last().click();
  await expect(visitor.locator(".errs")).toContainText("phone");
  await visitor.getByLabel(/^Phone/).fill("+233 24 111 2222");
  await visitor.getByLabel("Organisation (optional)").fill("University of Ghana");
  await visitor.getByRole("button", { name: "Register", exact: true }).last().click();
  await expect(visitor.getByText("You're registered. We'll email you to confirm your place.")).toBeVisible();
  await expect(visitor.getByText("Accra · GH₵1,200 · 1 seat left")).toBeVisible();
  await expect(visitor.locator(".ses .pill.live")).toHaveText("Registered");

  // --- the administrator confirms the place and downloads the list ---
  await admin.goto("/admin/registrations");
  const row = admin.getByRole("row", { name: new RegExp(email) });
  await expect(row).toContainText("University of Ghana");
  const [patched] = await Promise.all([
    admin.waitForResponse((r) => r.url().includes("/api/registrations/") && r.request().method() === "PATCH"),
    row.getByRole("combobox").selectOption("CONFIRMED"),
  ]);
  expect(patched.status()).toBe(200);
  await admin.reload();
  await expect(admin.getByRole("row", { name: new RegExp(email) }).getByRole("combobox")).toHaveValue("CONFIRMED");
  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByRole("link", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^afrimetrica-registrations-\d{4}-\d{2}-\d{2}\.csv$/);

  // --- the visitor sees the confirmed place in My Account ---
  await visitor.goto("/account");
  const mine = visitor.getByRole("row", { name: new RegExp(title.replace(/[()]/g, "\\$&")) });
  await expect(mine).toContainText("Confirmed");
  await expect(mine.getByRole("button", { name: "Cancel" })).toHaveCount(0); // confirmed places are cancelled by Afrimetrica
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test("people who aren't administrators can't open the admin area", async ({ page }, info) => {
  await page.goto("/admin/courses");
  await expect(page).toHaveURL(/\/signin\?next=/);
  await page.getByRole("link", { name: "Create a free account" }).click();
  await page.waitForURL(/\/signup/);
  await page.getByLabel("Email").fill(`not-admin-${info.project.name}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/admin\/courses/);
  await expect(page.getByRole("heading", { name: "Only site administrators can see this page" })).toBeVisible();
  expect((await page.request.get("/api/admin/registrations/csv")).status()).toBe(403);
});
