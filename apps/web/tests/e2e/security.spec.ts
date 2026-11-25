import { expect, test } from "@playwright/test";

// The content security policy must not block anything the site itself uses.
test("security headers are sent and nothing on the main pages is blocked", async ({ page }) => {
  const blocked: string[] = [];
  await page.addInitScript(() =>
    document.addEventListener("securitypolicyviolation", (e) =>
      console.log(`CSP-BLOCKED ${e.violatedDirective} ${e.blockedURI}`),
    ),
  );
  page.on("console", (m) => {
    if (m.text().startsWith("CSP-BLOCKED")) blocked.push(m.text());
  });
  const res = await page.goto("/");
  const h = res!.headers();
  expect(h["content-security-policy"]).toContain("script-src 'self' 'unsafe-inline'");
  expect(h["content-security-policy"]).not.toContain("unsafe-eval");
  expect(h["strict-transport-security"]).toContain("max-age=31536000");
  expect(h["permissions-policy"]).toContain("camera=()");
  for (const path of ["/about", "/training", "/training/course/ls-strategy", "/analytics", "/surveys", "/signin"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  expect(blocked).toEqual([]);
});
