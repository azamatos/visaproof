<script setup lang="ts">
// Is the data fresh? Each part of the pipeline, when it last ran and whether that's on time (shared/status.ts).
import { when, type State, type Status } from "#shared/status";

const { data, error, refresh } = await useFetch<Status>("/api/status", { lazy: import.meta.client });
const DOT: Record<State, string> = {
  ok: "bg-accent",
  late: "bg-refuse",
  stale: "bg-refuse",
  unknown: "border border-muted",
};

useSeoMeta({
  title: "Status",
  description:
    "Is Visaproof's data fresh: when the job boards, the registers and the postings were last read.",
});
</script>

<template>
  <main
    id="main"
    class="mx-auto flex w-full max-w-[1264px] flex-col gap-8 px-4 pt-6 pb-12 md:gap-9 md:px-8 md:pt-12 md:pb-[72px]"
  >
    <div class="flex max-w-[760px] flex-col gap-3">
      <p class="font-mono text-mono text-muted">
        /status<template v-if="data"> · {{ when(data.checkedAt) }}</template>
      </p>
      <h1 class="text-2xl font-medium tracking-[-0.01em] md:text-3xl">Is the data fresh?</h1>
      <p
        v-if="data"
        role="status"
        class="flex items-start gap-3 text-lg text-pretty md:text-xl md:leading-[30px]"
      >
        <span
          aria-hidden="true"
          class="mt-2 size-3 flex-none rounded-full md:mt-[9px]"
          :class="DOT[data.tone]"
        />
        <span>{{ data.headline }}</span>
      </p>
      <p v-else-if="!error" role="status" class="text-lg text-fg-2">Checking…</p>
    </div>

    <div
      v-if="error"
      role="alert"
      class="flex flex-col items-start gap-3 rounded-card border border-line p-6"
    >
      <p class="text-base">The status didn't load: this page couldn't reach our data.</p>
      <button
        type="button"
        class="h-11 cursor-pointer rounded-control border border-line-strong px-4"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <div
      v-else-if="data"
      class="grid grid-cols-1 items-start gap-4 md:grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))]"
    >
      <section
        v-for="part in data.parts"
        :key="part.key"
        :aria-labelledby="`part-${part.key}`"
        class="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-5"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 :id="`part-${part.key}`" class="text-lg font-medium">{{ part.name }}</h2>
          <span class="inline-flex items-center gap-2 text-sm">
            <span aria-hidden="true" class="size-2 rounded-full" :class="DOT[part.state]" />{{ part.label }}
          </span>
        </div>
        <dl v-if="part.rows.length" class="m-0 flex flex-col gap-2 text-[15px] leading-[22px]">
          <div v-for="r in part.rows" :key="r.k" class="flex items-baseline justify-between gap-4">
            <dt class="text-fg-2">{{ r.k }}</dt>
            <dd class="m-0 text-right" :class="r.mono ? 'font-mono text-[13px]' : ''">{{ r.v }}</dd>
          </div>
        </dl>
        <p v-if="part.note" class="border-t border-line pt-3 text-sm leading-[21px] text-fg-2 text-pretty">
          {{ part.note }}
        </p>
      </section>
    </div>

    <div v-else aria-hidden="true" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div
        v-for="k in ['Job boards', 'Open roles', 'Registers', 'Reading the postings']"
        :key="k"
        class="flex flex-col gap-3 rounded-card border border-line p-5"
      >
        <span class="text-lg font-medium text-fg-2">{{ k }}</span>
        <span class="h-3.5 w-2/3 rounded bg-fill" />
        <span class="h-3.5 w-1/2 rounded bg-fill opacity-70" />
      </div>
    </div>

    <p class="max-w-[760px] text-[15px] leading-[23px] text-fg-2 text-pretty">
      When something runs late or fails, it shows here first, with what it means for the answers, and a short
      notice appears on every page. Accuracy is on
      <NuxtLink to="/method" class="underline underline-offset-[3px]">Method</NuxtLink>.
    </p>
  </main>
</template>
