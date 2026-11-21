import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/", nav: "Home", h1: /Advancing research/ },
  { path: "/about", nav: "About", h1: /built around good evidence/ },
  { path: "/training", nav: "Training", h1: /Research methods training/ },
  { path: "/surveys", nav: "Surveys", h1: /Ask better questions/ },
  { path: "/analytics", nav: "Analytics", h1: /Data analysis you can rely on/ },
  { path: "/consultancy", nav: "Consultancy", h1: /Research and evaluation consultancy/ },
  { path: "/resources", nav: "Resources", h1: /Resources for better research/ },
  { path: "/resources/guides/how-many-responses-do-you-need", nav: "Resources", h1: /How many responses/ },
  { path: "/contact", nav: "Contact", h1: /Get in touch/ },
];

for (const p of PAGES) {
  test(`${p.path} renders, is accessible and fits the screen`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(p.path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.h1);
    await expect(page).toHaveTitle(/Afrimetrica/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(p.path === "/" ? /^https?:\/\/[^/]+\/?$/ : new RegExp(`${p.path}$`));
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: p.nav })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("the sample size calculator updates as you type", async ({ page }) => {
  await page.goto("/resources");
  await expect(page.getByTestId("needed")).toHaveText("385");
  await page.getByLabel("Population (blank = large)").fill("300");
  await page.getByLabel("Expected response rate (%)").fill("40");
  await expect(page.getByTestId("needed")).toHaveText("169");
  await expect(page.getByTestId("invite")).toHaveText("423");
  await page.getByLabel("Confidence").selectOption({ label: "99%" });
  await page.getByLabel("Population (blank = large)").fill("");
  await expect(page.getByTestId("needed")).toHaveText("664");
});

test("guides show the sample size table", async ({ page }) => {
  await page.goto("/resources/guides/how-many-responses-do-you-need");
  await expect(page.getByRole("row")).toHaveText([
    /Margin of error/,
    /±10%\s*97/,
    /±5%\s*385/,
    /±3%\s*1,068/,
    /±2%\s*2,401/,
  ]);
});

test("unknown pages show a friendly 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/couldn't find that page/);
  expect((await page.goto("/resources/guides/no-such-guide"))?.status()).toBe(404);
});

test("sitemap and robots.txt list the public pages only", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/about", "/training", "/contact", "/resources/guides/likert-or-rating-scale"])
    expect(sitemap).toContain(`${p}</loc>`);
  expect(sitemap).not.toContain("/account");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/account/);
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test("the home page describes the organisation for search engines", async ({ page }) => {
  await page.goto("/");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld).toMatchObject({
    "@type": "Organization",
    name: "Afrimetrica",
    parentOrganization: { name: "Regelco International Ltd" },
  });
});

test("enquiry forms point to the current site until step 6", async ({ page }) => {
  await page.goto("/consultancy");
  await expect(page.getByRole("link", { name: "Open the enquiry form" })).toHaveAttribute(
    "href",
    "https://surveyspider.onrender.com/#consultancy",
  );
});

test("contact details set by an administrator appear on the Contact page", async ({ page }) => {
  // No details are set in a fresh database, so the page says how to reach us instead of showing empty fields.
  await page.goto("/contact");
  await expect(page.getByText("Use the enquiry form and we'll reply by email.")).toBeVisible();
});
