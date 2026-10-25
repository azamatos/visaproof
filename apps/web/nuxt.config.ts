import tailwindcss from "@tailwindcss/vite";

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
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
  runtimeConfig: {
    databaseUrl: "postgres://sponsored@localhost:5433/sponsored",
    // Where "Report a wrong answer" and removal requests go (NUXT_PUBLIC_CORRECTIONS_EMAIL)
    public: { correctionsEmail: "hi@azamatos.com" },
  },
  // The data changes every 6 hours at most: answers are kept for 5 minutes per URL (served stale while one
  // request refreshes them), in a bounded cache so many different searches can't fill the memory.
  $production: { routeRules: { "/api/**": { cache: { maxAge: 300, swr: true } } } },
  nitro: { storage: { cache: { driver: "lru-cache", max: 2000, maxSize: 64 * 1024 * 1024 } } },
  // Unit and browser tests run in Node, next to the config.
  typescript: {
    strict: true,
    nodeTsConfig: { include: ["../test/**/*", "../e2e/**/*", "../playwright.config.ts"] },
  },
});
