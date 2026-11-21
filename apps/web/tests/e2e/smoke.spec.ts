import { expect, test } from "@playwright/test";

test("home page renders with the brand and title", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Afrimetrica/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Advancing research");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test("health check responds", async ({ request }) => {
  const r = await request.get("/healthz");
  expect(r.ok()).toBe(true);
  expect(await r.json()).toEqual({ ok: true });
});
