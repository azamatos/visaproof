// What search engines and link previews are told about each page. One switch, NUXT_PUBLIC_INDEXABLE, lets search
// engines in: off (the default, for local runs and tests), every page and response says noindex. The server has it
// on (deploy/compose.yml).

export const SITE_NAME = "Visaproof";
export const SITE_TITLE = "Visaproof: developer jobs in Europe, visa answer first";

// The robots meta tag of a page. A page not worth a search result (a closed role, a search with filters, a 404)
// still lets crawlers follow its links.
export function robotsMeta(indexable: boolean, index: boolean): string {
  if (!indexable) return "noindex, nofollow";
  return index ? "index, follow, max-image-preview:large" : "noindex, follow";
}

// The X-Robots-Tag header of any response, pages and files alike; null for none. The API and the share images are
// never search results.
export function robotsHeader(indexable: boolean, path: string): string | null {
  if (!indexable) return "noindex, nofollow";
  return path.startsWith("/api/") || path.startsWith("/og/") ? "noindex" : null;
}

export function robotsTxt(indexable: boolean, siteUrl: string): string {
  const lines = [
    "# Visaproof: developer jobs in Europe, visa answer first.",
    "User-agent: *",
    "Disallow: /api/",
  ];
  return indexable
    ? [...lines, "", `Sitemap: ${siteUrl}/sitemap.xml`, ""].join("\n")
    : [...lines, "", "# Not open to search engines: every page says noindex.", ""].join("\n");
}

const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "apos" }[c] ?? ""};`,
  );

export type SitemapEntry = { loc: string; lastmod?: Date | string | null };

const entry = (tag: "url" | "sitemap", e: SitemapEntry) =>
  `<${tag}><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : ""}</${tag}>`;

export const urlset = (entries: SitemapEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((e) => entry("url", e)).join("\n")}\n</urlset>\n`;

export const sitemapIndex = (entries: SitemapEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((e) => entry("sitemap", e)).join("\n")}\n</sitemapindex>\n`;
