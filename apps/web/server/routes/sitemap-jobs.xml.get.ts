import { urlset } from "#shared/seo";

// Every open role. About 15,000: well under a sitemap's 50,000.
export default defineEventHandler(async (event) => {
  const url = siteUrl(event);
  const rows = await db()<{ id: number; lastmod: Date }[]>`
    select id::int as id, coalesce(changed_at, first_seen_at) as lastmod from posting
    where closed_at is null order by id`;
  return sitemapXml(
    event,
    urlset(rows.map((r) => ({ loc: `${url}/jobs/${String(r.id)}`, lastmod: r.lastmod }))),
  );
});
