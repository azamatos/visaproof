import { robotsHeader } from "#shared/seo";

// Every response says whether search engines may index it (shared/seo.ts): noindex everywhere until the launch.
export default defineEventHandler((event) => {
  const header = robotsHeader(useRuntimeConfig(event).public.indexable, event.path);
  if (header) setResponseHeader(event, "x-robots-tag", header);
});
