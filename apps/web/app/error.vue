<script setup lang="ts">
// Any page that doesn't exist (and, rarely, one that broke), with the header and footer, as a shell would say it.
import type { NuxtError } from "#app";

const { error } = defineProps<{ error: NuxtError }>();
const missing = computed(() => error.statusCode === 404);
const path = useRoute().path;

useTheme();
useHead({ title: missing.value ? "Page not found · Visaproof" : "Something broke · Visaproof" });
useSeoMeta({ robots: "noindex" });
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <SiteHeader />
    <main
      id="main"
      class="mx-auto flex w-full max-w-[1264px] flex-1 flex-col gap-4 px-4 py-12 md:px-8 md:py-20"
    >
      <p class="font-mono text-mono text-muted break-all">
        <span class="text-accent">➜</span> ~ cd {{ path }}
        <span class="text-refuse">{{ missing ? "no such page" : `error ${String(error.statusCode)}` }}</span>
      </p>
      <h1 class="text-2xl font-medium md:text-3xl">
        {{ missing ? "This page doesn't exist" : "Something broke on our side" }}
      </h1>
      <p class="max-w-[560px] text-[15px] leading-[23px] text-fg-2 text-pretty">
        {{
          missing
            ? "The link may be cut short or out of date."
            : "The job boards are fine; this page couldn't be built. Try again in a minute."
        }}
      </p>
      <nav aria-label="Where to go" class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <NuxtLink
          to="/"
          class="flex h-[52px] items-center justify-center rounded-control border border-line-strong bg-surface-hover px-5 text-base text-fg no-underline"
          @click="clearError({ redirect: '/' })"
        >
          Search the open roles
        </NuxtLink>
        <NuxtLink to="/method" class="inline-flex min-h-11 items-center justify-center px-2 text-sm">
          How it works
        </NuxtLink>
        <NuxtLink to="/status" class="inline-flex min-h-11 items-center justify-center px-2 text-sm"
          >Status</NuxtLink
        >
      </nav>
    </main>
    <SiteFooter />
  </div>
</template>
