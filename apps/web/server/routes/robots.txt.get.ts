import { robotsTxt } from "#shared/seo";

export default defineEventHandler((event) => {
  const { indexable, siteUrl } = useRuntimeConfig(event).public;
  setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
  return robotsTxt(indexable, siteUrl);
});
