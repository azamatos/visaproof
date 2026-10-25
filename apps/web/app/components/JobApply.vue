<script setup lang="ts">
// The way out to apply: the company's own page in a new tab, or, for a closed role, its other roles here.
import type { JobDetail } from "#shared/evidence";

const { job } = defineProps<{ job: JobDetail }>();
</script>

<template>
  <div class="flex flex-col gap-2">
    <template v-if="!job.closedAt">
      <UiExternalLink
        :href="job.url"
        :icon="false"
        class="flex h-[52px] items-center justify-center gap-2 rounded-control bg-accent text-base font-medium text-accent-ink no-underline"
      >
        Apply on the company's site
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9.5 2.5h4v4M13.5 2.5l-6 6M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
        </svg>
      </UiExternalLink>
      <p class="text-center text-xs text-fg-2">
        Opens {{ job.company.name }}'s own job board. We don't take applications.
      </p>
    </template>
    <template v-else>
      <p
        class="flex h-[52px] items-center justify-center rounded-control border border-dashed border-unknown-line text-base text-fg-2"
      >
        Applications closed
      </p>
      <NuxtLink
        :to="job.company.path"
        class="flex h-12 items-center justify-center rounded-control border border-line-strong text-[15px] text-fg no-underline"
      >
        Open roles at {{ job.company.name }}
      </NuxtLink>
    </template>
  </div>
</template>
