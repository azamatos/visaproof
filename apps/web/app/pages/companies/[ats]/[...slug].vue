<script setup lang="ts">
// One company's board: its open roles, strongest first, and whether it can hire on a visa: what its postings say,
// then the registers and the Blue Card rule for the countries it hires in.
import { type CompanyDetail, companyEvidence, hiresIn, lastRead } from "#shared/company";

const route = useRoute();
const path = computed(() => {
  const slug = route.params.slug;
  return `/api/companies/${String(route.params.ats)}/${(Array.isArray(slug) ? slug : [slug]).map((s) => encodeURIComponent(String(s))).join("/")}`;
});
const { data: company, error, refresh } = await useFetch<CompanyDetail>(path, { lazy: import.meta.client });
const notFound = computed(() => error.value?.statusCode === 404);
if (import.meta.server && notFound.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 404);
}
const items = computed(() => (company.value ? companyEvidence(company.value) : []));
const email = useRuntimeConfig().public.correctionsEmail;
const of = (x: number) => `${String(x)} of ${String(company.value?.open ?? 0)}`;

useSeoMeta({
  title: () => company.value?.name ?? (notFound.value ? "Company not found" : "Company"),
  description: () =>
    company.value
      ? `${company.value.name}: ${String(company.value.open)} open developer roles in Europe, and whether it can hire on a visa.`
      : undefined,
});
</script>

<template>
  <main
    id="main"
    class="mx-auto flex w-full max-w-[1264px] flex-col gap-6 px-4 pt-2 pb-10 md:gap-7 md:px-8 md:pt-6 md:pb-16"
  >
    <NuxtLink
      to="/"
      class="inline-flex min-h-11 items-center gap-2 self-start text-sm text-fg-2 no-underline hover:text-fg"
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M13 8H3M7 4 3 8l4 4" />
      </svg>
      Search all roles
    </NuxtLink>

    <section v-if="notFound" class="flex max-w-[560px] flex-col gap-4 py-8">
      <p class="font-mono text-mono text-muted">404</p>
      <h1 class="text-2xl font-medium">We don't read this company's board</h1>
      <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
        The link may be cut short, or the company asked us to take its roles down.
      </p>
      <NuxtLink
        to="/"
        class="flex h-[52px] items-center justify-center self-start rounded-control border border-line-strong bg-surface-hover px-5 text-base text-fg no-underline"
      >
        Search the open roles
      </NuxtLink>
    </section>

    <section
      v-else-if="error"
      role="alert"
      class="flex flex-col items-start gap-3 rounded-card border border-line p-6"
    >
      <p class="text-base">This company didn't load: this page couldn't reach our data.</p>
      <button
        type="button"
        class="h-11 cursor-pointer rounded-control border border-line-strong px-4"
        @click="refresh()"
      >
        Try again
      </button>
    </section>

    <div v-else-if="!company" aria-busy="true" class="flex flex-col gap-3">
      <p role="status" class="sr-only">Loading the company</p>
      <span aria-hidden="true" class="h-[26px] w-1/2 max-w-[400px] rounded-md bg-fill" />
      <span aria-hidden="true" class="h-3.5 w-1/3 max-w-[300px] rounded bg-fill opacity-70" />
    </div>

    <template v-else>
      <div class="-mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div class="flex flex-col gap-2">
          <p class="font-mono text-mono text-muted">Company</p>
          <h1 class="text-2xl font-medium tracking-[-0.01em] md:text-3xl">{{ company.name }}</h1>
          <p class="text-[15px] text-fg-2 md:text-base">{{ hiresIn(company) }}</p>
        </div>
        <UiExternalLink
          v-if="company.board"
          :href="company.board"
          class="min-h-11 text-[15px] underline underline-offset-[3px]"
          >{{ company.name }}'s board on {{ company.boardName }}</UiExternalLink
        >
      </div>

      <p
        v-if="company.postsForOthers"
        class="rounded-control border border-refuse-line bg-refuse-tint p-3.5 text-sm text-pretty"
      >
        {{ company.name }} posts roles for other companies, so the employer, and who would sponsor you, may be
        someone else: each posting names them. The checks here are for {{ company.name }} itself.
      </p>

      <div class="flex flex-wrap items-start gap-x-14 gap-y-10">
        <div class="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
          <dl
            class="m-0 grid grid-cols-2 overflow-hidden rounded-card border border-line md:grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))]"
          >
            <div class="flex flex-col gap-1.5 border-r border-b border-line px-4 py-3.5 md:border-b-0">
              <dt class="text-xs text-fg-2">Open roles</dt>
              <dd class="m-0 text-[15px] font-medium">{{ company.open }}</dd>
            </div>
            <div class="flex flex-col gap-1.5 border-b border-line px-4 py-3.5 md:border-r md:border-b-0">
              <dt class="text-xs text-fg-2">Say they sponsor</dt>
              <dd class="m-0 text-[15px] font-medium">{{ of(company.said.sponsors) }}</dd>
            </div>
            <div class="flex flex-col gap-1.5 border-r border-line px-4 py-3.5">
              <dt class="text-xs text-fg-2">Refuse</dt>
              <dd class="m-0 text-[15px] font-medium">{{ of(company.said.wont) }}</dd>
            </div>
            <div class="flex flex-col gap-1.5 px-4 py-3.5">
              <dt class="text-xs text-fg-2">Board last read</dt>
              <dd class="m-0 font-mono text-[13px]">{{ lastRead(company) ?? "not yet" }}</dd>
            </div>
          </dl>

          <section aria-labelledby="roles-title" class="flex flex-col gap-3">
            <h2 id="roles-title" class="text-xl font-medium">Open roles</h2>
            <p v-if="!company.roles.length" class="text-[15px] text-fg-2">
              No open roles for developers in Europe right now. We read the board every 6 hours.
            </p>
            <ol class="m-0 flex list-none flex-col gap-3 p-0">
              <li v-for="job in company.roles" :key="job.id"><JobCard :job="job" /></li>
            </ol>
            <NuxtLink
              v-if="company.open > company.roles.length"
              :to="{ path: '/', query: { q: company.name, visa: 'all' } }"
              class="inline-flex min-h-11 items-center self-start text-sm underline underline-offset-[3px]"
            >
              The other {{ company.open - company.roles.length }} roles, in search
            </NuxtLink>
          </section>
        </div>

        <aside
          :aria-label="`Visa answers for ${company.name}`"
          class="flex w-full flex-col gap-3 md:max-w-[420px] md:flex-[1_1_340px]"
        >
          <h2 class="text-xl font-medium">Can it hire on a visa?</h2>
          <EvidenceItem v-for="item in items" :key="item.label" :item="item" />
          <p class="text-[13px] leading-[19px] text-fg-2 text-pretty">
            Work at {{ company.name }} and see something wrong?
            <a
              :href="`mailto:${email}?subject=${encodeURIComponent(`Correction: ${company.name}`)}`"
              class="underline underline-offset-[3px]"
              >Ask for a correction or removal</a
            >. We act on it within a week.
          </p>
        </aside>
      </div>
    </template>
  </main>
</template>
