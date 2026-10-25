<script setup lang="ts">
// One answer and what it rests on: the posting's sentence, a register entry or a salary rule, with its source and
// when it was checked. The design's Evidence component.
import type { RelocationState, VisaState } from "#shared/answers";
import type { EvidenceItem } from "#shared/evidence";

const { item } = defineProps<{ item: EvidenceItem }>();
const TONE = { muted: "text-fg-2", refuse: "text-refuse" } as const;
</script>

<template>
  <section class="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h3 class="text-[15px] leading-5 font-medium">{{ item.label }}</h3>
      <VisaChip v-if="item.kind === 'visa'" :state="item.state as VisaState" size="md" />
      <RelocChip v-else-if="item.kind === 'reloc'" :state="item.state as RelocationState" size="md" />
      <span
        v-else
        class="inline-flex min-h-8 items-center text-sm font-medium"
        :class="item.tone ? TONE[item.tone] : 'text-fg'"
        >{{ item.value }}</span
      >
    </div>
    <blockquote
      v-if="item.quote"
      class="m-0 rounded-control bg-surface-hover px-3.5 py-3 text-base text-pretty break-words"
    >
      “{{ item.quote }}”
    </blockquote>
    <p v-if="item.note" class="text-sm leading-[21px] text-fg-2 text-pretty">{{ item.note }}</p>
    <dl
      v-if="item.facts?.length"
      class="m-0 flex flex-col gap-1.5 rounded-control bg-surface-hover px-3.5 py-3 text-sm"
    >
      <div v-for="f in item.facts" :key="f.k" class="flex items-baseline justify-between gap-4">
        <dt class="text-fg-2">{{ f.k }}</dt>
        <dd class="m-0 text-right font-medium">{{ f.v }}</dd>
      </div>
    </dl>
    <p class="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-mono text-muted">
      <span>{{ item.source }}</span>
      <span v-if="item.checked">checked {{ item.checked }}</span>
    </p>
    <NuxtLink
      v-if="item.link"
      :to="item.link.to"
      class="-mt-1.5 -mb-2.5 inline-flex min-h-11 items-center gap-1.5 self-start text-sm underline underline-offset-[3px]"
    >
      {{ item.link.text }}
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 4l4 4-4 4" />
      </svg>
    </NuxtLink>
  </section>
</template>
