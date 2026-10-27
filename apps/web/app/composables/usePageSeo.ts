import { robotsMeta, SITE_TITLE } from "#shared/seo";

// A page's title and description, and what search engines and link previews get from them: the canonical URL,
// the share image (/og/…) and whether the page is worth a search result (shared/seo.ts).
export function usePageSeo(seo: {
  title?: MaybeRefOrGetter<string | undefined>;
  description: MaybeRefOrGetter<string | undefined>;
  // The share image under /og, without ".png" ("jobs/123"); the site's by default.
  image?: MaybeRefOrGetter<string | undefined>;
  imageAlt?: MaybeRefOrGetter<string | undefined>;
  // false for a page that shouldn't be a search result: a closed role, a search with filters, a 404.
  index?: MaybeRefOrGetter<boolean>;
  // The canonical path; by default the page's path without its query.
  path?: MaybeRefOrGetter<string | undefined>;
  // The path a shared link keeps (og:url), when it isn't the canonical one: a search keeps its filters.
  sharePath?: MaybeRefOrGetter<string | undefined>;
}) {
  const { siteUrl, indexable } = useRuntimeConfig().public;
  const route = useRoute();
  const url = computed(() => siteUrl + (toValue(seo.path) ?? route.path));
  const title = () => toValue(seo.title) ?? SITE_TITLE;
  useSeoMeta({
    title: seo.title,
    description: seo.description,
    ogTitle: title,
    ogDescription: seo.description,
    ogUrl: () => {
      const share = toValue(seo.sharePath);
      return share ? siteUrl + share : url.value;
    },
    ogImage: () => `${siteUrl}/og/${toValue(seo.image) ?? "site"}.png`,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageType: "image/png",
    ogImageAlt: () => toValue(seo.imageAlt) ?? title(),
    robots: () => robotsMeta(indexable, toValue(seo.index) ?? true),
  });
  useHead({ link: [{ rel: "canonical", href: url }] });
}
