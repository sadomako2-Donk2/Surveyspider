import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { linkFromEmail } from "./support/mail";

async function noSeriousA11yIssues(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(
    r.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}
async function signUpAndConfirm(page: Page, email: string, next: string) {
  await page.goto(`/signup?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Your name").fill("Inbox Admin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signup"));
  await page.goto(await linkFromEmail(email, /Confirm/, "/verify-email"));
  await expect(page.getByRole("heading", { name: /all set/ })).toBeVisible();
}

test("a visitor sends an enquiry and an admin works it in the inbox", async ({ browser }, info) => {
  const p = info.project.name;
  const sender = `Akua ${p} ${Date.now().toString(36)}`;
  const errors: string[] = [];

  const visitor = await (await browser.newContext()).newPage();
  visitor.on("pageerror", (e) => errors.push(e.message));
  await visitor.goto("/consultancy");
  const form = visitor.locator("form.enquiry");
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(form.locator(".errs")).toHaveText(
    "Enter your name. Enter a valid email address. Tell us a little about what you need. Tick the box so we can contact you.",
  );
  await form.getByLabel("Your name").fill(sender);
  await form.getByLabel("Email").fill(`akua-${p}@example.org`);
  await form.getByLabel("Organisation (optional)").fill("Health NGO");
  await form.getByLabel("What do you need?").selectOption("Monitoring and evaluation");
  await form.getByLabel("Timeline").selectOption("1–3 months");
  await form.getByLabel("Approximate budget").selectOption("US$5,000–20,000");
  await form.getByLabel("About your project").fill("Baseline survey for a 3-region maternal health programme.");
  await form.getByLabel("You can contact me about this enquiry.").check();
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(visitor.getByRole("heading", { name: "Thank you. We'll be in touch." })).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  admin.on("pageerror", (e) => errors.push(e.message));
  await signUpAndConfirm(admin, `e2e-inbox-${p}@example.com`, "/admin/enquiries");
  await admin.goto("/admin/enquiries?type=CONSULTANCY");
  const row = admin.getByRole("row", { name: new RegExp(sender) });
  await expect(row).toContainText("Monitoring and evaluation · 1–3 months · US$5,000–20,000");
  await expect(row).toContainText("Baseline survey for a 3-region maternal health programme.");
  await noSeriousA11yIssues(admin);
  const [res] = await Promise.all([
    admin.waitForResponse((r) => r.url().includes("/api/admin/enquiries/") && r.request().method() === "PATCH"),
    row.getByRole("combobox").selectOption("CONTACTED"),
  ]);
  expect(res.status()).toBe(200);
  await admin.goto("/admin/enquiries?status=CONTACTED");
  await expect(admin.getByRole("row", { name: new RegExp(sender) })).toBeVisible();
  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByRole("link", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^afrimetrica-enquiries-\d{4}-\d{2}-\d{2}\.csv$/);

  await admin.goto("/admin/activity");
  await expect(admin.getByRole("row", { name: /Changed an enquiry's status.*NEW → CONTACTED/ }).first()).toBeVisible();
  await noSeriousA11yIssues(admin);
  expect(errors).toEqual([]);
});

test("an admin sets the contact details and adds a colleague", async ({ browser }, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Contact details are site-wide; one project is enough and avoids the two runs overwriting each other.",
  );
  const admin = await (await browser.newContext()).newPage();
  await signUpAndConfirm(admin, "e2e-inbox-desktop-settings@example.com", "/account");
  // not in ADMIN_EMAILS: can't open the admin area
  await admin.goto("/admin/settings");
  await expect(admin.getByRole("heading", { name: "Only site administrators can see this page" })).toBeVisible();

  const boss = await (await browser.newContext()).newPage();
  await signUpAndConfirm(boss, "e2e-boss-desktop@example.com", "/admin/settings");
  await boss.goto("/admin/settings");
  await boss.getByLabel("Public email").fill("info@afrimetrica.example");
  await boss.getByLabel("WhatsApp number").fill("+233 20 000 0000");
  await boss.getByLabel("LinkedIn page").fill("http://not-linkedin.example");
  await boss.getByRole("button", { name: "Save contact details" }).click();
  await expect(boss.locator(".errs")).toContainText("LinkedIn");
  await boss.getByLabel("LinkedIn page").fill("");
  await boss.getByRole("button", { name: "Save contact details" }).click();
  await expect(boss.getByText("Contact details saved.")).toBeVisible();
  await noSeriousA11yIssues(boss);

  await boss.goto("/contact");
  await expect(boss.getByRole("link", { name: "info@afrimetrica.example" })).toHaveAttribute(
    "href",
    "mailto:info@afrimetrica.example",
  );
  await expect(boss.getByRole("link", { name: "Message us on WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/233200000000",
  );

  await boss.goto("/admin/members");
  await boss.getByLabel("Add someone by email").fill("e2e-inbox-desktop-settings@example.com");
  // Admins can add analysts and members; only owners can add owners and admins.
  const roleChoices = boss.locator("form.add-member select[name=role] option");
  expect(await roleChoices.evaluateAll((o) => o.map((x) => x.textContent))).toEqual(["Analyst", "Member"]);
  await boss.locator("form.add-member select[name=role]").selectOption("ANALYST");
  await boss.getByRole("button", { name: "Add" }).click();
  await expect(boss.getByRole("row", { name: /e2e-inbox-desktop-settings@example.com/ })).toBeVisible();
  await noSeriousA11yIssues(boss);
});
