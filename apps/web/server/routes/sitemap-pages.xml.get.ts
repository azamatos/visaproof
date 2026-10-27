import { COUNTRIES } from "#shared/countries";
import { urlset } from "#shared/seo";

// Search, the countries that have open roles, and the pages about the site.
export default defineEventHandler(async (event) => {
  const url = siteUrl(event);
  const [at, countries] = await Promise.all([
    lastRead(),
    db()<{ code: string }[]>`
      select distinct c as code from posting, unnest(countries) c
      where closed_at is null and c in ${db()(Object.keys(COUNTRIES))} order by 1`,
  ]);
  return sitemapXml(
    event,
    urlset([
      { loc: `${url}/`, lastmod: at },
      ...countries.map((c) => ({ loc: `${url}/countries/${c.code.toLowerCase()}`, lastmod: at })),
      { loc: `${url}/method` },
      { loc: `${url}/status`, lastmod: at },
    ]),
  );
});
