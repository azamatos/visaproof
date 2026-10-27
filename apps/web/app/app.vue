<script setup lang="ts">
import { SITE_NAME, SITE_TITLE } from "#shared/seo";

useTheme();
useHead({ titleTemplate: (title) => (title ? `${title} · ${SITE_NAME}` : SITE_TITLE) });
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-bg focus:p-2"
    >
      Skip to content
    </a>
    <SiteHeader />
    <StaleNotice />
    <NuxtPage />
    <SiteFooter />
  </div>
</template>
