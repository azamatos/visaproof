import { companyPath } from "#shared/boards";
import { urlset } from "#shared/seo";

// Every board with an open role, once (Lever's EU and US boards share a slug and a page).
export default defineEventHandler(async (event) => {
  const url = siteUrl(event);
  const rows = await db()<{ ats: string; slug: string; lastmod: Date }[]>`
    select c.ats, c.slug, max(coalesce(p.changed_at, p.first_seen_at)) as lastmod
    from company c join posting p on p.company_id = c.id
    where p.closed_at is null group by c.ats, c.slug order by c.ats, c.slug`;
  return sitemapXml(
    event,
    urlset(rows.map((r) => ({ loc: url + companyPath(r.ats, r.slug), lastmod: r.lastmod }))),
  );
});
