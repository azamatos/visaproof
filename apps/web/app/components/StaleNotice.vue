<script setup lang="ts">
// On every page, when the job boards haven't been read for more than 13 hours: some roles may have closed.
import type { Status } from "#shared/status";

const route = useRoute();
const { data } = await useFetch<Status>("/api/status", { key: "status", lazy: true });
</script>

<template>
  <div
    v-if="data?.notice && route.path !== '/status'"
    role="status"
    class="border-b border-refuse-line bg-refuse-tint"
  >
    <p class="mx-auto flex max-w-[1264px] flex-wrap items-center gap-x-2 px-4 py-2.5 text-sm md:px-8">
      <span>{{ data.notice }}</span>
      <NuxtLink to="/status" class="text-fg underline underline-offset-[3px]">See the status</NuxtLink>
    </p>
  </div>
</template>
