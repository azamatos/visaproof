import tailwindcss from "@tailwindcss/vite";
import { SITE_NAME } from "./shared/seo";

// Visaproof's site: server-rendered pages that read the pipeline's Postgres (NUXT_DATABASE_URL).
export default defineNuxtConfig({
  compatibilityDate: "2026-10-24",
  devtools: { enabled: false },
  devServer: { port: 4003 },
  modules: ["@nuxt/fonts"],
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  // Self-hosted at build time: no request to Google from a visitor's browser.
  fonts: {
    families: [
      { name: "Geist", provider: "google", weights: [400, 500] },
      { name: "Space Mono", provider: "google", weights: [400] },
    ],
  },
  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "color-scheme", content: "dark light" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "en_GB" },
        // X still needs this for the large share image (unhead's typed field for it is deprecated)
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [
        // The owner's icons (Claude Design, 2026-10-27)
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", type: "image/png", href: "/favicon-96x96.png", sizes: "96x96" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: "postgres://sponsored@localhost:5433/sponsored",
    public: {
      // Where "Report a wrong answer" and removal requests go (NUXT_PUBLIC_CORRECTIONS_EMAIL)
      correctionsEmail: "hi@azamatos.com",
      // Canonical links, share images and sitemaps point here (NUXT_PUBLIC_SITE_URL)
      siteUrl: "https://visaproof.azamatos.com",
      // Off by default, so local runs and tests say noindex everywhere; the server turns it on (NUXT_PUBLIC_INDEXABLE)
      indexable: false,
    },
  },
  // The data changes every 6 hours at most: answers are kept for 5 minutes per URL, in a bounded cache so many
  // different searches can't fill the memory. No stale-while-revalidate: Nitro would serve an entry of any age to
  // the first visitor after a quiet spell, hiding the stale-data notice exactly when it's needed.
  $production: {
    routeRules: {
      // What a page may load: only its own files, plus Cloudflare's privacy-friendly analytics. Nuxt's config
      // script and the inlined styles need 'unsafe-inline'. Set here, not in Caddy, so the browser tests run
      // under it.
      "/**": {
        headers: {
          "content-security-policy": [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self' https://cloudflareinsights.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
          ].join("; "),
        },
      },
      "/api/**": { cache: { maxAge: 300, swr: false } },
      "/api/status": { cache: { maxAge: 60, swr: false } },
      // Sitemaps change with every read of the job boards (6 hours); an hour is fresh enough.
      "/sitemap.xml": { cache: { maxAge: 3600, swr: false } },
      "/sitemap-pages.xml": { cache: { maxAge: 3600, swr: false } },
      "/sitemap-companies.xml": { cache: { maxAge: 3600, swr: false } },
      "/sitemap-jobs.xml": { cache: { maxAge: 3600, swr: false } },
    },
  },
  nitro: {
    storage: { cache: { driver: "lru-cache", max: 2000, maxSize: 64 * 1024 * 1024 } },
    // Brotli and gzip copies of the scripts and styles, served as they are
    compressPublicAssets: true,
  },
  // The styles go in the page itself: no stylesheet request before the first paint (Lighthouse on a phone).
  features: { inlineStyles: true },
  // Unit and browser tests run in Node, next to the config.
  typescript: {
    strict: true,
    nodeTsConfig: { include: ["../test/**/*", "../e2e/**/*", "../playwright.config.ts"] },
  },
});
