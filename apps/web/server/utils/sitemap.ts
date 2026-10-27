import type { H3Event } from "h3";

// The sitemaps list the pages worth a search result: the open roles, the companies that have them, the countries
// with roles, and the site's own pages. Closed roles drop out the run after they close.

export const sitemapXml = (event: H3Event, xml: string) => {
  setResponseHeader(event, "content-type", "application/xml; charset=utf-8");
  return xml;
};

export const siteUrl = (event: H3Event) => useRuntimeConfig(event).public.siteUrl;

// When the job boards were last read: the date of the lists that change with every run. A run that failed changed
// nothing.
export async function lastRead(): Promise<Date | null> {
  const [r] = await db()<{ at: Date | null }[]>`
    select max(finished_at) as at from run where kind = 'ingest' and ${workedRun()}`;
  return r?.at ?? null;
}
