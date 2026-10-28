import { describe, expect, it } from "vitest";
import { robotsHeader, robotsMeta, robotsTxt, sitemapIndex, urlset } from "../shared/seo";

describe("robots", () => {
  it("with indexing off, keeps everything out of search results", () => {
    expect(robotsMeta(false, true)).toBe("noindex, nofollow");
    expect(robotsHeader(false, "/")).toBe("noindex, nofollow");
    expect(robotsHeader(false, "/og/site.png")).toBe("noindex, nofollow");
    expect(robotsTxt(false, "https://visaproof.azamatos.com")).not.toContain("Sitemap:");
  });
  it("with indexing on, indexes pages but not the API; the share images carry no header", () => {
    expect(robotsMeta(true, true)).toBe("index, follow, max-image-preview:large");
    expect(robotsMeta(true, false)).toBe("noindex, follow");
    expect(robotsHeader(true, "/jobs/1")).toBeNull();
    expect(robotsHeader(true, "/api/roles")).toBe("noindex");
    expect(robotsHeader(true, "/og/site.png")).toBeNull();
    expect(robotsTxt(true, "https://visaproof.azamatos.com")).toBe(
      "# Visaproof: developer jobs in Europe, visa answer first.\nUser-agent: *\nDisallow: /api/\n\nSitemap: https://visaproof.azamatos.com/sitemap.xml\n",
    );
  });
});

describe("sitemaps", () => {
  it("escapes URLs and dates each entry", () => {
    expect(
      urlset([
        { loc: "https://x.test/companies/ashby/a&b", lastmod: "2026-10-26T06:20:00Z" },
        { loc: "https://x.test/" },
      ]),
    ).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://x.test/companies/ashby/a&amp;b</loc><lastmod>2026-10-26T06:20:00.000Z</lastmod></url>
<url><loc>https://x.test/</loc></url>
</urlset>
`);
    expect(sitemapIndex([{ loc: "https://x.test/sitemap-jobs.xml" }])).toContain(
      "<sitemap><loc>https://x.test/sitemap-jobs.xml</loc></sitemap>",
    );
  });
});
