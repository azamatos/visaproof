<script setup lang="ts">
// When the role was posted and read, where from, and the technologies the posting names.
import { day, type JobDetail } from "#shared/evidence";

const { job } = defineProps<{ job: JobDetail }>();
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
</script>

<template>
  <dl class="m-0 flex flex-col gap-2 text-sm">
    <div class="flex justify-between gap-3">
      <dt class="text-fg-2">Posted</dt>
      <dd class="m-0 font-mono text-mono">{{ day(job.posted) }}</dd>
    </div>
    <div class="flex justify-between gap-3">
      <dt class="text-fg-2">First seen here</dt>
      <dd class="m-0 font-mono text-mono">{{ day(job.firstSeen) }}</dd>
    </div>
    <div class="flex justify-between gap-3">
      <dt class="text-fg-2">{{ job.closedAt ? "Closed" : "Last checked" }}</dt>
      <dd class="m-0 font-mono text-mono">
        {{ job.closedAt ? day(job.closedAt) : `${day(job.lastSeen)}, ${time(job.lastSeen)} UTC` }}
      </dd>
    </div>
    <div class="flex justify-between gap-3">
      <dt class="flex-none text-fg-2">Read from</dt>
      <dd class="m-0 text-right">
        <UiExternalLink v-if="job.company.board" :href="job.company.board" class="text-fg"
          >{{ job.company.name }}'s board on {{ job.company.boardName }}</UiExternalLink
        >
        <template v-else>{{ job.company.boardName }}</template>
      </dd>
    </div>
    <div v-if="job.technologies.length" class="flex flex-col gap-2 pt-1">
      <dt class="text-fg-2">Technologies named</dt>
      <dd class="m-0 flex flex-wrap gap-1.5">
        <NuxtLink
          v-for="t in job.technologies"
          :key="t.key"
          :to="{ path: '/', query: { q: t.label } }"
          :aria-label="`Search roles with ${t.label}`"
          class="inline-flex min-h-6 items-center rounded-full border border-line px-2.5 font-mono text-mono text-fg-2 no-underline hover:border-line-strong hover:text-fg"
          >{{ t.label }}</NuxtLink
        >
      </dd>
    </div>
  </dl>
</template>
