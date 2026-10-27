<script setup lang="ts">
// One country: its roles, and how developers get a work permit there, with the official amounts, their sources
// and the date they were checked. Countries not researched yet say so instead of guessing.
import { countryName, inCountry } from "#shared/countries";
import type { CountryDetail } from "#shared/country";
import { day } from "#shared/evidence";
import { GUIDES } from "#shared/guides";

const route = useRoute();
const code = computed(() => String(route.params.code).toUpperCase());
const {
  data: country,
  error,
  refresh,
} = await useFetch<CountryDetail>(() => `/api/countries/${String(route.params.code).toLowerCase()}`, {
  lazy: import.meta.client,
});
const notFound = computed(() => error.value?.statusCode === 404);
// Any other failure is passing: 503 asks crawlers to come back rather than drop the page.
if (import.meta.server && error.value) {
  const event = useRequestEvent();
  if (event) setResponseStatus(event, notFound.value ? 404 : 503);
}
const guide = computed(() => GUIDES[code.value]);
const n = (x: number) => x.toLocaleString("en-US");
const roles = (x: number) => `${n(x)} ${x === 1 ? "role" : "roles"}`;
const pct = (x: number, of: number) => (of ? `${String(Math.round((x / of) * 100))}%` : "0%");
const SYMBOL: Record<string, string> = { EUR: "€", GBP: "£" };
const amount = (a: number, currency: string) =>
  `${SYMBOL[currency] ?? `${currency} `}${a.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(a) ? 0 : 2 })}`;
const tables = computed(() =>
  (guide.value?.amounts ?? []).map((t) => ({
    title: t.title,
    rows: Object.entries(t.rules).flatMap(([rule, label]) => {
      const r = country.value?.rules.find((x) => x.rule === rule);
      return r ? [{ label, value: amount(r.amount, r.currency) }] : [];
    }),
  })),
);
const checkedOn = computed(() => day(country.value?.rules[0]?.checkedOn));
const search = computed(() => ({ path: "/", query: { country: code.value } }));

usePageSeo({
  title: () =>
    country.value ? `Developer jobs in ${country.value.name}` : notFound.value ? "Not found" : "Country",
  description: () =>
    country.value
      ? `${n(country.value.open)} developer roles in ${country.value.name}${guide.value ? `, and how developers get a work permit there (${guide.value.route})` : ""}.`
      : undefined,
  image: () => `countries/${code.value.toLowerCase()}`,
  // As the sitemap lists it: a country with open roles.
  index: () => !!country.value?.open,
  path: () => `/countries/${code.value.toLowerCase()}`,
});
</script>

<template>
  <main
    id="main"
    class="mx-auto flex w-full max-w-[1264px] flex-col gap-6 px-4 pt-2 pb-10 md:gap-8 md:px-8 md:pt-6 md:pb-16"
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
      <h1 class="text-2xl font-medium">We don't cover this country</h1>
      <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
        Visaproof covers the EU, the EEA, the United Kingdom and Switzerland.
      </p>
    </section>

    <section
      v-else-if="error"
      role="alert"
      class="flex flex-col items-start gap-3 rounded-card border border-line p-6"
    >
      <p class="text-base">This country didn't load: this page couldn't reach our data.</p>
      <button
        type="button"
        class="h-11 cursor-pointer rounded-control border border-line-strong px-4"
        @click="refresh()"
      >
        Try again
      </button>
    </section>

    <div v-else-if="!country" aria-busy="true" class="flex flex-col gap-3">
      <p role="status" class="sr-only">Loading {{ countryName(code) }}</p>
      <span aria-hidden="true" class="h-[26px] w-1/3 max-w-[300px] rounded-md bg-fill" />
      <span aria-hidden="true" class="h-3.5 w-1/2 max-w-[400px] rounded bg-fill opacity-70" />
    </div>

    <template v-else>
      <div class="-mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div class="flex max-w-[640px] flex-col gap-2">
          <p class="font-mono text-mono text-muted">Country</p>
          <h1 class="text-2xl font-medium tracking-[-0.01em] md:text-3xl">{{ country.name }}</h1>
          <p class="text-[15px] text-fg-2 text-pretty md:text-base">
            {{ roles(country.open) }} open at {{ n(country.companies) }} companies.
            {{ pct(country.salaryPosted, country.open) }} post a salary.
          </p>
        </div>
        <div class="flex flex-col gap-1.5">
          <NuxtLink
            :to="search"
            class="flex h-12 items-center justify-center rounded-control bg-accent px-5 text-[15px] font-medium text-accent-ink no-underline"
          >
            Show {{ roles(country.shown) }} in {{ inCountry(country.code) }}
          </NuxtLink>
          <p v-if="country.wont" class="text-xs text-fg-2">
            {{ n(country.wont) }} more refuse visas and are hidden.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-start gap-x-14 gap-y-10">
        <div class="flex min-w-0 flex-[999_1_560px] flex-col gap-10">
          <section
            v-if="guide"
            aria-labelledby="permit-title"
            class="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 md:p-6"
          >
            <p class="font-mono text-mono text-muted">How developers get a work permit</p>
            <h2 id="permit-title" class="text-xl font-medium md:text-2xl">{{ guide.route }}</h2>
            <p class="text-[15px] leading-[23px] text-pretty md:text-base">{{ guide.intro }}</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <dl
                v-for="t in tables"
                :key="t.title"
                class="m-0 flex flex-col gap-2 rounded-control bg-surface-hover px-4 py-3.5"
              >
                <dt class="text-sm font-medium">{{ t.title }}</dt>
                <dd
                  v-for="r in t.rows"
                  :key="r.label"
                  class="m-0 flex items-baseline justify-between gap-4 text-sm"
                >
                  <span class="text-fg-2">{{ r.label }}</span>
                  <span class="font-medium whitespace-nowrap">{{ r.value }}</span>
                </dd>
              </dl>
            </div>
            <p class="text-sm text-fg-2">{{ guide.period }}</p>
            <p v-if="guide.limits" class="text-sm text-fg-2 text-pretty">{{ guide.limits }}</p>
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <li v-for="s in guide.sources" :key="s.href">
                <UiExternalLink :href="s.href" class="min-h-11 text-sm underline underline-offset-[3px]">{{
                  s.text
                }}</UiExternalLink>
              </li>
            </ul>
            <p class="font-mono text-mono text-muted">
              amounts checked {{ checkedOn
              }}<template v-if="country.register?.loadedAt">
                · register reloaded daily, last {{ day(country.register.loadedAt) }}</template
              >
              · not legal advice
            </p>
          </section>
          <section
            v-else
            aria-labelledby="permit-title"
            class="flex flex-col gap-3 rounded-card border border-dashed border-unknown-line p-5"
          >
            <h2 id="permit-title" class="text-xl font-medium">How developers get a work permit</h2>
            <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
              We haven't researched the permit route for {{ country.name }} yet, and we don't check a sponsor
              register here. The answers for its roles rest on each posting's own words. Germany, the
              Netherlands and the United Kingdom are done; more follow after the launch.
            </p>
          </section>

          <section v-if="guide" aria-labelledby="meaning-title" class="flex flex-col gap-4">
            <h2 id="meaning-title" class="text-xl font-medium">What that means for roles here</h2>
            <div v-for="m in guide.meaning" :key="m.state" class="flex flex-col gap-2 sm:flex-row sm:gap-5">
              <div class="sm:w-[150px] sm:flex-none"><VisaChip :state="m.state" /></div>
              <p class="text-[15px] leading-[23px] text-pretty">
                {{ m.text }}
                <span v-if="m.state === 'can'" class="text-fg-2">{{ roles(country.can) }} here now.</span>
              </p>
            </div>
          </section>

          <div class="flex flex-col gap-2 rounded-card border border-line p-4">
            <p class="text-[15px] font-medium">Languages</p>
            <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
              <template v-if="country.languages.checked">
                Of the {{ roles(country.languages.checked) }} here checked for languages so far,
                {{ n(country.languages.required) }} require a language other than English.
              </template>
              <template v-else
                >None of the roles here is checked for languages yet; we check every posting.</template
              >
            </p>
            <NuxtLink
              :to="{ path: '/', query: { country: code, nolang: '1' } }"
              class="inline-flex min-h-11 items-center self-start text-sm underline underline-offset-[3px]"
            >
              Show only roles with no local language
            </NuxtLink>
          </div>
        </div>

        <aside
          :aria-label="`Roles in ${country.name}`"
          class="flex w-full flex-col gap-6 md:max-w-[420px] md:flex-[1_1_340px]"
        >
          <section v-if="country.register" aria-labelledby="register-title" class="flex flex-col gap-3">
            <h2 id="register-title" class="text-xl font-medium">Our register check</h2>
            <dl class="m-0 flex flex-col gap-2 text-[15px]">
              <div class="flex justify-between gap-4">
                <dt class="text-fg-2">Companies with roles here</dt>
                <dd class="m-0">{{ n(country.register.companies) }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-fg-2">Confirmed by hand</dt>
                <dd class="m-0">{{ n(country.register.reviewed) }}</dd>
              </div>
              <div class="flex justify-between gap-4">
                <dt class="text-fg-2">On the register</dt>
                <dd class="m-0">{{ n(country.register.listed) }}</dd>
              </div>
            </dl>
            <p class="text-sm leading-[21px] text-fg-2 text-pretty">
              Names in postings rarely equal the legal name on the register, so we confirm each employer by
              hand, the biggest first. The rest say “not checked yet”.
            </p>
          </section>
          <section aria-labelledby="roles-title" class="flex flex-col gap-3">
            <h2 id="roles-title" class="text-xl font-medium">Strongest answers here</h2>
            <ol class="m-0 flex list-none flex-col gap-3 p-0">
              <li v-for="job in country.roles" :key="job.id"><JobCard :job="job" /></li>
            </ol>
            <NuxtLink
              :to="search"
              class="inline-flex min-h-11 items-center self-start text-sm underline underline-offset-[3px]"
            >
              All {{ roles(country.shown) }} in {{ inCountry(country.code) }}
            </NuxtLink>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
