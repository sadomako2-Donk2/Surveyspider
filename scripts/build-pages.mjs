// Lists every public page of the live site for search engines: its address, title and description.
// Run after changing public content:  npm start  (in another terminal), then  node scripts/build-pages.mjs
// It opens the site in a headless browser, follows every public link, and writes public/pages.json,
// which server.mjs uses for the sitemap and for each page's title, description and social preview.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // the pre-installed Playwright

export const PUBLIC = new Set(["home", "about", "practices", "training", "surveys", "analytics", "consultancy", "resources", "contact", "privacy", "terms", "pricing", "paper-survey"]);
const base = process.argv[2] || "http://localhost:10000";
const keyOf = (href) => {
  const h = href.replace(/^.*?#/, "").replace(/^\//, "").replace(/\/+$/, "");
  return PUBLIC.has(h.split("/")[0]) ? (h === "home" ? "" : h) : null;
};
const browser = await chromium.launch();
const page = await browser.newPage();
const seen = new Map(), queue = [""];
while (queue.length) {
  const k = queue.shift();
  if (seen.has(k)) continue;
  await page.goto(`${base}/#${k || "home"}`);
  await page.waitForFunction(() => document.querySelector("#main h1, #main h2"), null, { timeout: 15000 });
  // A merged page redirects to another address: skip it (the page it redirects to is listed in its own right).
  const landed = await page.evaluate(() => decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, "") || "");
  if (landed !== k && !(k === "" && landed === "")) { seen.set(k, null); if (!seen.has(landed)) queue.push(landed); continue; }
  const info = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || "",
    h1: document.querySelector("#main h1")?.textContent.replace(/\s+/g, " ").trim() || "",
    links: [...document.querySelectorAll('a[href^="#"], a[href^="/"]')].map((a) => a.getAttribute("href")),
    courses: [...new Set([...document.querySelectorAll('#main a[href*="training/course/"]')].map((a) => a.getAttribute("href").replace(/^#/, "/")))],
  }));
  const entry = { path: "/" + k, title: info.title, description: info.description, h1: info.h1 };
  // A subject with a single course mostly repeats that course's page: point search engines to the course instead.
  if (k.startsWith("training/subject/") && info.courses.length === 1) entry.canonical = info.courses[0];
  // The approach page appears under both About and Research & Advisory; About is the main one.
  if (k === "consultancy/approach") entry.canonical = "/about/approach";
  // About and Executive Education both explain certificates of completion; the Executive Education page is the fuller one.
  if (k === "about/certificates") entry.canonical = "/training/certificates";
  seen.set(k, entry);
  for (const l of info.links) { const n = keyOf(l); if (n !== null && !seen.has(n)) queue.push(n); }
}
await browser.close();
const pages = [...seen.values()].filter(Boolean).sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
writeFileSync(new URL("../public/pages.json", import.meta.url), JSON.stringify(pages, null, 1) + "\n");
console.log(`${pages.length} public pages written to public/pages.json`);
