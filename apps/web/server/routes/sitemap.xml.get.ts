import { sitemapIndex } from "#shared/seo";

export default defineEventHandler(async (event) => {
  const url = siteUrl(event);
  const at = await lastRead();
  return sitemapXml(
    event,
    sitemapIndex(
      ["pages", "companies", "jobs"].map((name) => ({ loc: `${url}/sitemap-${name}.xml`, lastmod: at })),
    ),
  );
});
