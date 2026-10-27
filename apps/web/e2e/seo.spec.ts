import { expect, test } from "@playwright/test";

// What search engines and link previews get. The tests run with indexing off, the default.
const SITE = "https://visaproof.azamatos.com";

const meta = (page: import("@playwright/test").Page, key: string) =>
  page.locator(`meta[property="${key}"], meta[name="${key}"]`).first();

// A PNG's size, from its header.
const pngSize = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20) });

test("with indexing off, keeps every page out of search results", async ({ page, request }) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(meta(page, "robots")).toHaveAttribute("content", "noindex, nofollow");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).not.toContain("Sitemap:");
});

test("gives a role its canonical link and its own share image", async ({ page, request }) => {
  await page.goto("/jobs/1");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/jobs/1`);
  await expect(meta(page, "og:title")).toHaveAttribute(
    "content",
    "Senior Backend Engineer (Go) at Fjord Systems",
  );
  await expect(meta(page, "og:image")).toHaveAttribute("content", `${SITE}/og/jobs/1.png`);
  await expect(meta(page, "twitter:card")).toHaveAttribute("content", "summary_large_image");

  for (const path of [
    "/og/jobs/1.png",
    "/og/site.png",
    "/og/companies/greenhouse/northwind.png",
    "/og/countries/de.png",
  ]) {
    const image = await request.get(path);
    expect(image.status(), path).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect(pngSize(await image.body())).toEqual({ width: 1200, height: 630 });
  }
  expect((await request.get("/og/jobs/99999.png")).status()).toBe(404);
});

test("points every search to the search page", async ({ page }) => {
  await page.goto("/?q=engineer&country=NL");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/`);
  await page.goto("/");
  const site = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
  ) as {
    "@type"?: string;
    name?: string;
  };
  expect(site).toMatchObject({ "@type": "WebSite", name: "Visaproof" });
});

test("lists the open roles, their companies and the countries in the sitemaps", async ({ request }) => {
  const index = await request.get("/sitemap.xml");
  expect(index.headers()["content-type"]).toContain("application/xml");
  for (const name of ["pages", "companies", "jobs"])
    expect(await index.text()).toContain(`${SITE}/sitemap-${name}.xml`);

  const jobs = await (await request.get("/sitemap-jobs.xml")).text();
  expect(jobs).toContain(`<loc>${SITE}/jobs/1</loc>`);
  // Role 6 is closed.
  expect(jobs).not.toContain(`<loc>${SITE}/jobs/6</loc>`);
  expect(await (await request.get("/sitemap-companies.xml")).text()).toContain(
    `<loc>${SITE}/companies/greenhouse/northwind</loc>`,
  );
  const pages = await (await request.get("/sitemap-pages.xml")).text();
  expect(pages).toContain(`<loc>${SITE}/countries/nl</loc>`);
  expect(pages).toContain(`<loc>${SITE}/method</loc>`);
});
