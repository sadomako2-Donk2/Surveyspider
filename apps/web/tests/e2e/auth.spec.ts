import { linkFromEmail } from "./support/mail";
import { expect, test, type Page } from "@playwright/test";

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test("sign up, confirm email, sign out, sign in, reset password", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `ama-${info.project.name}-${Date.now()}@example.com`;

  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin\?next=%2Faccount|\/signin\?next=\/account/);
  await page.getByRole("link", { name: "Create a free account" }).click();
  await page.waitForURL(/\/signup/);
  await page.getByLabel("Your name").fill("Ama Mensah");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator(".errs")).toContainText("at least 8 characters");
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Hello, Ama" })).toBeVisible();
  await expect(page.getByText("Confirm your email address.")).toBeVisible();
  expect(await noOverflow(page)).toBe(true);

  await page.goto(await linkFromEmail(email, /Confirm/, "/verify-email"));
  await expect(page.getByRole("heading", { name: /all set/ })).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email$/); // token removed from the address bar
  await page.getByRole("link", { name: "Go to My Account" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("Confirm your email address.")).toHaveCount(0);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".errs")).toContainText("Wrong email or password");
  await page.getByLabel("Password").fill("a strong password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Hello, Ama" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: /sent you a link/ })).toBeVisible();
  await page.goto(await linkFromEmail(email, /Reset/, "/reset-password"));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password").fill("brand new password");
  await page.getByLabel("Type it again").fill("different password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.locator(".errs")).toContainText("don't match");
  await page.getByLabel("Type it again").fill("brand new password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hello, Ama" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("a used confirmation link explains what to do", async ({ page }) => {
  await page.goto(`/verify-email?token=${"f".repeat(64)}`);
  await expect(page.getByRole("heading", { name: "That link didn't work" })).toBeVisible();
});

test("sign-in page has no Google button when Google isn't configured", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("link", { name: "Continue with Google" })).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
});
