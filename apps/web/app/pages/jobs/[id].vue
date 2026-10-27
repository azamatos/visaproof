<script setup lang="ts">
// One role: the four answers on top, the way to apply, and what each answer rests on. No posting text: it isn't
// ours to republish, and the link goes to the original.
import { RELOCATION_LABEL, VISA_LABEL } from "#shared/answers";
import { countryName, inCountry } from "#shared/countries";
import { day, evidence, languageList, type JobDetail } from "#shared/evidence";

const route = useRoute();
const router = useRouter();
// The first visit renders on the server; moving here from a list shows the skeleton while the role loads.
const {
  data: job,
  status,
  error,
  refresh,
} = await useFetch<JobDetail>(() => `/api/jobs/${String(route.params.id)}`, {
  lazy: import.meta.client,
});
const notFound = computed(() => error.value?.statusCode === 404);
// Any other failure is passing: 503 asks crawlers to come back rather than drop the page.
if (import.meta.server && error.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, notFound.value ? 404 : 503);
}

const answers = computed(() => (job.value ? evidence(job.value) : null));
const language = computed(() => {
  const l = job.value?.languages;
  return l === null || l === undefined
    ? "Not read yet"
    : l.length
      ? `${languageList(l)} required`
      : "English only";
});
// "Can sponsor" in a role with several countries says where.
const visaWhere = computed(() =>
  job.value?.visa === "can" && job.value.countries.length > 1
    ? `in ${job.value.canIn.map(inCountry).join(" and ")}`
    : "",
);
const permits = computed(() =>
  (job.value?.countries ?? [])
    .filter((c) => ["DE", "GB", "NL"].includes(c))
    .map((c) => ({ to: `/countries/${c.toLowerCase()}`, label: `Work permits in ${countryName(c)}` })),
);
const reportShown = computed(() =>
  job.value
    ? [
        { key: "visa", label: "Visa", value: VISA_LABEL[job.value.visa] },
        { key: "relocation", label: "Relocation", value: RELOCATION_LABEL[job.value.relocation] },
        { key: "language", label: "Language", value: language.value },
        { key: "pay", label: "Pay", value: job.value.salary ?? "Not posted" },
      ]
    : [],
);
const reporting = ref(false);

// Back to the search it came from, with its filters and scroll; or to the search when opened from a link.
function back(e: MouseEvent) {
  const previous = (window.history.state as { back?: unknown } | null)?.back;
  if (typeof previous === "string" && (previous === "/" || previous.startsWith("/?"))) {
    e.preventDefault();
    router.back();
  }
}

usePageSeo({
  title: () =>
    job.value
      ? `${job.value.title} at ${job.value.company.name}`
      : notFound.value
        ? "Role not found"
        : "Role",
  description: () =>
    job.value
      ? `${job.value.title} at ${job.value.company.name}, ${job.value.place}: ${VISA_LABEL[job.value.visa].toLowerCase()}, with the evidence.`
      : undefined,
  image: () => (job.value ? `jobs/${String(job.value.id)}` : undefined),
  imageAlt: () =>
    job.value ? `${job.value.title} at ${job.value.company.name}: ${VISA_LABEL[job.value.visa]}` : undefined,
  // A closed role stays reachable for links people kept, but isn't a search result.
  index: () => !!job.value && !job.value.closedAt,
  // "/jobs/01" is "/jobs/1"
  path: () => (job.value ? `/jobs/${String(job.value.id)}` : undefined),
});
</script>

<template>
  <main
    id="main"
    class="mx-auto flex w-full max-w-[1264px] flex-col gap-6 px-4 pt-2 pb-10 md:px-8 md:pt-6 md:pb-16"
  >
    <NuxtLink
      to="/"
      class="inline-flex min-h-11 items-center gap-2 self-start text-sm text-fg-2 no-underline hover:text-fg"
      @click="back"
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
      Back to results
    </NuxtLink>

    <!-- Not found -->
    <section v-if="notFound" class="flex max-w-[560px] flex-col gap-4 py-8">
      <p class="font-mono text-mono text-muted">404</p>
      <h1 class="text-2xl font-medium text-balance">We can't find this role</h1>
      <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
        The link may be cut short, or the company asked us to take the role down.
      </p>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <NuxtLink
          to="/"
          class="flex h-[52px] items-center justify-center rounded-control border border-line-strong bg-surface-hover px-5 text-base text-fg no-underline"
        >
          Search the open roles
        </NuxtLink>
        <NuxtLink to="/status" class="inline-flex min-h-11 items-center justify-center px-3 text-sm">
          Check data status
        </NuxtLink>
      </div>
    </section>

    <!-- Couldn't load -->
    <section
      v-else-if="error"
      role="alert"
      class="flex flex-col items-start gap-3 rounded-card border border-line p-6"
    >
      <p class="text-base">
        This role didn't load. The job boards are fine; this page couldn't reach our data.
      </p>
      <button
        type="button"
        class="h-11 cursor-pointer rounded-control border border-line-strong px-4"
        @click="refresh()"
      >
        Try again
      </button>
    </section>

    <!-- Loading -->
    <div v-else-if="!job" aria-busy="true" class="flex flex-col gap-5">
      <p role="status" class="sr-only">Loading the role</p>
      <div aria-hidden="true" class="flex flex-col gap-2.5">
        <span class="h-[26px] w-[78%] max-w-[560px] rounded-md bg-fill" />
        <span class="h-3.5 w-[56%] max-w-[400px] rounded bg-fill opacity-70" />
        <span class="h-3 w-[44%] max-w-[300px] rounded bg-fill opacity-50" />
      </div>
      <div aria-hidden="true" class="flex max-w-[760px] flex-col border-t border-line">
        <div
          v-for="k in ['Visa', 'Moving', 'Language', 'Pay']"
          :key="k"
          class="flex min-h-[52px] items-center justify-between border-b border-line"
        >
          <span class="text-sm text-fg-2">{{ k }}</span>
          <span class="h-7 w-36 rounded-full bg-fill" />
        </div>
      </div>
      <span
        v-if="status === 'pending'"
        aria-hidden="true"
        class="h-[52px] max-w-[760px] rounded-control bg-fill"
      />
    </div>

    <template v-else>
      <p
        v-if="job.closedAt"
        role="status"
        class="-mt-2 flex gap-2.5 rounded-control border border-dashed border-unknown-line p-3.5 text-sm"
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
          class="mt-0.5 flex-none text-fg-2"
        >
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 4.75V8l2.25 1.5" />
        </svg>
        <span
          >This role closed on {{ day(job.closedAt) }}. It is no longer on {{ job.company.name }}'s job board.
          The answers stay here so you can see what {{ job.company.name }} offered.</span
        >
      </p>
      <p
        v-else-if="job.visa === 'wont'"
        class="-mt-2 flex gap-2.5 rounded-control border border-line bg-surface-hover p-3.5 text-sm"
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
          class="mt-0.5 flex-none text-fg-2"
        >
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25V11M8 5h.01" />
        </svg>
        <span>The default search hides this role: the posting says it won't sponsor a visa.</span>
      </p>

      <p
        v-if="job.company.postsForOthers"
        class="-mt-2 rounded-control border border-refuse-line bg-refuse-tint p-3.5 text-sm text-pretty"
      >
        {{ job.company.name }} posts roles for other companies, so the employer, and who would sponsor you,
        may be someone else: the posting names them. The register checks below are for {{ job.company.name }}.
      </p>

      <div class="flex flex-wrap items-start gap-x-14 gap-y-10">
        <div class="flex min-w-0 flex-[999_1_560px] flex-col gap-6 md:gap-8">
          <div class="-mt-2 flex flex-col gap-2 md:mt-0 md:gap-2.5">
            <h1
              class="text-2xl font-medium tracking-[-0.01em] text-balance md:text-3xl"
              :class="job.closedAt ? 'text-fg-2' : ''"
            >
              {{ job.title }}
            </h1>
            <p class="text-[15px] leading-[22px] text-fg-2 md:text-base">
              <NuxtLink :to="job.company.path" class="text-fg underline underline-offset-[3px]">{{
                job.company.name
              }}</NuxtLink>
              · {{ job.place }}<template v-if="job.workMode"> · {{ job.workMode }}</template>
            </p>
            <p class="inline-flex items-center gap-2 font-mono text-mono text-muted">
              <span
                aria-hidden="true"
                class="size-2 rounded-full"
                :class="job.closedAt ? 'border border-muted' : 'bg-accent'"
              />
              <template v-if="job.closedAt">Closed · first seen {{ day(job.firstSeen) }}</template>
              <template v-else>Open · checked {{ day(job.lastSeen) }}</template>
            </p>
          </div>

          <dl
            class="m-0 flex flex-col border-t border-line-strong md:grid md:grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] md:overflow-hidden md:rounded-card md:border"
          >
            <div
              class="flex min-h-[52px] items-center justify-between gap-3 border-b border-line md:flex-col md:items-start md:gap-2.5 md:border-r md:border-b-0 md:px-[18px] md:py-4"
            >
              <dt class="text-sm text-fg-2 md:text-xs"><span class="hidden md:inline">1 · </span>Visa</dt>
              <dd class="m-0 flex flex-wrap items-center gap-2">
                <span v-if="visaWhere" class="font-mono text-mono text-muted">{{ visaWhere }}</span>
                <VisaChip :state="job.visa" size="md" />
              </dd>
            </div>
            <div
              class="flex min-h-[52px] items-center justify-between gap-3 border-b border-line md:flex-col md:items-start md:gap-2.5 md:border-r md:border-b-0 md:px-[18px] md:py-4"
            >
              <dt class="text-sm text-fg-2 md:text-xs"><span class="hidden md:inline">2 · </span>Moving</dt>
              <dd class="m-0"><RelocChip :state="job.relocation" size="md" /></dd>
            </div>
            <div
              class="flex min-h-[52px] items-center justify-between gap-3 border-b border-line md:flex-col md:items-start md:gap-2.5 md:border-r md:border-b-0 md:px-[18px] md:py-4"
            >
              <dt class="text-sm text-fg-2 md:text-xs"><span class="hidden md:inline">3 · </span>Language</dt>
              <dd
                class="m-0 flex min-h-8 items-center text-[15px] font-medium"
                :class="job.languages === null ? 'text-fg-2' : ''"
              >
                {{ language }}
              </dd>
            </div>
            <div
              class="flex min-h-[52px] items-center justify-between gap-3 border-b border-line md:flex-col md:items-start md:gap-2.5 md:border-b-0 md:px-[18px] md:py-4"
            >
              <dt class="text-sm text-fg-2 md:text-xs"><span class="hidden md:inline">4 · </span>Pay</dt>
              <dd
                class="m-0 flex min-h-8 items-center text-right text-[15px] font-medium md:text-left"
                :class="job.salary ? '' : 'text-fg-2'"
              >
                {{ job.salary ?? "Not posted" }}
              </dd>
            </div>
          </dl>

          <JobApply :job="job" class="md:hidden" />

          <section aria-labelledby="evidence-title" class="flex flex-col gap-3 md:gap-3.5">
            <h2 id="evidence-title" class="text-xl font-medium">Where the answers come from</h2>
            <div
              class="grid grid-cols-1 items-start gap-3 md:grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] md:gap-4"
            >
              <EvidenceItem v-for="item in answers?.items" :key="item.label" :item="item" />
            </div>
            <p
              v-if="answers?.next"
              class="rounded-card border border-dashed border-unknown-line px-4 py-3.5 text-sm leading-[21px] text-pretty"
            >
              <span class="text-fg-2">Next step: </span>{{ answers.next }}
            </p>
            <p class="mt-1 text-[13px] leading-[19px] text-fg-2 text-pretty md:text-sm">
              Based on the posting's text and public registers. Not legal advice: confirm with the employer
              before you move. We don't republish the posting; read it in full on {{ job.company.name }}'s
              board.
            </p>
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm underline underline-offset-[3px] md:hidden"
              @click="reporting = true"
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
                <path d="M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8" />
              </svg>
              Report a wrong answer
            </button>
          </section>

          <section aria-labelledby="listing-title" class="flex flex-col gap-2 md:hidden">
            <h2 id="listing-title" class="text-lg font-medium">This listing</h2>
            <JobListing :job="job" />
          </section>
        </div>

        <aside
          aria-label="Apply and more"
          class="flex w-full flex-col gap-4 md:max-w-[400px] md:flex-[1_1_320px]"
        >
          <div class="hidden flex-col gap-4 rounded-card border border-line bg-surface p-5 md:flex">
            <JobApply :job="job" />
            <div class="border-t border-line pt-3.5">
              <JobListing :job="job" />
            </div>
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm underline underline-offset-[3px]"
              @click="reporting = true"
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
                <path d="M3.5 14V2.5M3.5 3h8l-1.5 3 1.5 3h-8" />
              </svg>
              Report a wrong answer
            </button>
          </div>
          <NuxtLink
            :to="job.company.path"
            class="flex min-h-14 items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 text-[15px] text-fg no-underline hover:border-line-strong md:px-[18px]"
          >
            <span>{{
              job.company.others
                ? `Other open roles at ${job.company.name} (${job.company.others})`
                : `More about ${job.company.name}`
            }}</span>
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
              <path d="M6 4l4 4-4 4" />
            </svg>
          </NuxtLink>
          <NuxtLink
            v-for="p in permits"
            :key="p.to"
            :to="p.to"
            class="hidden min-h-14 items-center justify-between gap-3 rounded-card border border-line px-[18px] text-[15px] text-fg no-underline hover:border-line-strong md:flex"
          >
            <span>{{ p.label }}</span>
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
              <path d="M6 4l4 4-4 4" />
            </svg>
          </NuxtLink>
        </aside>
      </div>

      <ReportDialog
        v-model:open="reporting"
        :job="{ id: job.id, title: job.title, company: job.company.name, url: job.url }"
        :shown="reportShown"
      />
    </template>
  </main>
</template>
