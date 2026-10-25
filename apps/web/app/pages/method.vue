<script setup lang="ts">
// How Visaproof works and why its answers can be trusted: the steps, the five answers, the measured accuracy (from
// docs/findings.md, dated), what it can't do, and how a company asks for a correction. Counts are live.
import type { VisaState } from "#shared/answers";
import type { Stats } from "#shared/stats";

const { data: stats } = await useFetch<Stats>("/api/stats", { lazy: import.meta.client });
const email = useRuntimeConfig().public.correctionsEmail;
const n = (x: number | undefined) => (x === undefined ? "…" : x.toLocaleString("en-US"));
const roles = (x: number | undefined) => `${n(x)} ${x === 1 ? "role" : "roles"}`;
const share = computed(() =>
  stats.value?.roles
    ? `${String(Math.round((stats.value.mentions / stats.value.roles) * 100))}%`
    : "about a fifth",
);

const STATES = computed<{ state: VisaState; text: string }[]>(() => [
  {
    state: "sponsors",
    text: `The posting says it sponsors a visa for this role. ${roles(stats.value?.visa.sponsors)} now.`,
  },
  {
    state: "may",
    text: `The posting hedges: “case by case”, “for certain roles”. ${roles(stats.value?.visa.may)}.`,
  },
  {
    state: "can",
    text: `The law or a register lets the employer hire on a visa: a fact about the employer, not a promise. ${roles(stats.value?.visa.can)}, more as registers are confirmed.`,
  },
  {
    state: "unknown",
    text: `Nobody says yet. The job page explains the route for its country. ${roles(stats.value?.visa.unknown)}.`,
  },
  {
    state: "wont",
    text: `The posting refuses. ${roles(stats.value?.visa.wont)}, hidden unless you ask for all.`,
  },
]);
const CANT = [
  {
    k: "Tell you if you will get a visa",
    t: "Immigration offices decide. We show what the employer and the law say.",
  },
  { k: "Read what a posting doesn't say", t: "If the words aren't there, the answer is Unknown." },
  {
    k: "Check every employer on a register yet",
    t: "We confirm by hand, biggest employers first. The rest say “not checked yet”.",
  },
  {
    k: "Spot every agency",
    t: "Some staffing agencies post other companies' roles. The agency is not the sponsor.",
  },
  { k: "See every job board", t: "Lever and Workday boards are under-counted for now." },
  {
    k: "Know which office a salary is for",
    t: "Some ranges are for another country's office. We show the currency as posted.",
  },
];
const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "answers", label: "The five answers" },
  { id: "accuracy", label: "How accurate it is" },
  { id: "limits", label: "What it can't do" },
  { id: "companies", label: "For companies" },
];

useSeoMeta({
  title: "How it works",
  description:
    "How Visaproof reads job boards and registers, how accurate its visa answers are, and what it can't do.",
});
</script>

<template>
  <main
    id="main"
    class="mx-auto flex w-full max-w-[1264px] flex-wrap items-start gap-x-16 gap-y-8 px-4 pt-6 pb-12 md:px-8 md:pt-12 md:pb-[72px]"
  >
    <nav aria-label="On this page" class="hidden flex-col gap-1 md:sticky md:top-6 md:flex md:w-[200px]">
      <p class="pb-2 font-mono text-mono text-muted">On this page</p>
      <a
        v-for="s in SECTIONS"
        :key="s.id"
        :href="`#${s.id}`"
        class="inline-flex min-h-9 items-center text-sm text-fg-2 no-underline hover:text-fg"
        >{{ s.label }}</a
      >
    </nav>

    <article class="flex max-w-[760px] min-w-0 flex-1 flex-col gap-12">
      <header class="flex flex-col gap-3">
        <p class="font-mono text-mono text-muted">/method · updated 25 Oct 2026</p>
        <h1 class="text-2xl font-medium tracking-[-0.01em] md:text-3xl">How Visaproof works</h1>
        <p class="text-lg text-fg-2 text-pretty md:text-xl md:leading-[30px]">
          We read companies' own job boards, find what each posting says about visas, moving and language, and
          check the official registers. Every answer shows where it came from.
        </p>
      </header>

      <section id="how" aria-labelledby="how-title" class="flex scroll-mt-6 flex-col gap-5">
        <h2 id="how-title" class="text-xl font-medium md:text-2xl">How it works</h2>
        <ol class="m-0 flex list-none flex-col gap-5 p-0">
          <li class="flex flex-col gap-1.5">
            <h3 class="flex items-baseline gap-3 text-[17px] font-medium">
              <span class="font-mono text-mono text-accent">1</span>We read job boards
            </h3>
            <p class="pl-6 text-[15px] leading-[23px] text-fg-2 text-pretty">
              Every 6 hours, from the public boards companies run on Greenhouse, Ashby, SmartRecruiters,
              Workable, Personio, Recruitee, Lever and Workday. {{ n(stats?.boardsKnown) }} boards known;
              {{ n(stats?.companies) }} with software roles in Europe today, {{ n(stats?.roles) }} roles. EU,
              EEA, UK and Switzerland only. Never LinkedIn or sites whose terms forbid it.
            </p>
          </li>
          <li class="flex flex-col gap-1.5">
            <h3 class="flex items-baseline gap-3 text-[17px] font-medium">
              <span class="font-mono text-mono text-accent">2</span>We find the sentence
            </h3>
            <p class="pl-6 text-[15px] leading-[23px] text-fg-2 text-pretty">
              {{ share }} of postings mention visas, relocation, permits or the right to work. Claude Opus 5.5
              reads those and answers with the exact sentence. If the sentence isn't in the posting word for
              word, the answer is dropped. The rest show Unknown, unless the law gives an answer. A second
              pass, with Claude Sonnet 5.5, reads every posting for languages it requires.
            </p>
          </li>
          <li class="flex flex-col gap-1.5">
            <h3 class="flex items-baseline gap-3 text-[17px] font-medium">
              <span class="font-mono text-mono text-accent">3</span>We check the law
            </h3>
            <p class="pl-6 text-[15px] leading-[23px] text-fg-2 text-pretty">
              UK and Netherlands: the official sponsor registers, reloaded daily, each employer confirmed by
              hand ({{ n(stats?.reviewed) }} so far, biggest first). Germany: any employer can hire on a Blue
              Card above €45,934.20 a year for IT jobs in 2026, so a posted salary above it means Can sponsor.
              <NuxtLink to="/countries/de" class="underline underline-offset-[3px]"
                >How the Blue Card works</NuxtLink
              >.
            </p>
          </li>
          <li class="flex flex-col gap-1.5">
            <h3 class="flex items-baseline gap-3 text-[17px] font-medium">
              <span class="font-mono text-mono text-accent">4</span>We sort strongest first
            </h3>
            <p class="pl-6 text-[15px] leading-[23px] text-fg-2 text-pretty">
              Roles that say they sponsor come first, then the hedges, then what the law allows, then the
              unknowns. Refusals are hidden unless you ask for all.
            </p>
          </li>
        </ol>
      </section>

      <section id="answers" aria-labelledby="answers-title" class="flex scroll-mt-6 flex-col gap-4">
        <h2 id="answers-title" class="text-xl font-medium md:text-2xl">The five answers</h2>
        <dl class="m-0 flex flex-col">
          <div
            v-for="s in STATES"
            :key="s.state"
            class="flex flex-col gap-2 border-b border-line py-3.5 sm:flex-row sm:items-start sm:gap-5"
          >
            <dt class="sm:w-[150px] sm:flex-none"><VisaChip :state="s.state" /></dt>
            <dd class="m-0 text-[15px] leading-[23px] text-pretty">{{ s.text }}</dd>
          </div>
        </dl>
        <p class="text-sm text-fg-2">
          Round chips quote the posting. The square one comes from the law or a register. Dashed means nobody
          says yet.
        </p>
      </section>

      <section id="accuracy" aria-labelledby="accuracy-title" class="flex scroll-mt-6 flex-col gap-4">
        <h2 id="accuracy-title" class="text-xl font-medium md:text-2xl">How accurate it is</h2>
        <p class="text-[15px] leading-[23px] text-pretty">
          We read 200 postings in full, labelled each answer by hand with its sentence, and compared.
          <strong class="font-medium">Precise</strong>: when we say it, the posting says it.
          <strong class="font-medium">Complete</strong>: when the posting says it, we find it.
        </p>
        <!-- Scrolls sideways on a phone; focusable, so a keyboard can scroll it too. -->
        <div
          role="region"
          aria-label="Accuracy table"
          tabindex="0"
          class="overflow-x-auto rounded-card border border-line"
        >
          <table class="w-full min-w-[520px] border-collapse text-left text-[15px]">
            <caption class="border-b border-line px-4 py-3 text-left font-mono text-mono text-muted">
              Accuracy on 200 hand-labelled postings, 23 and 24 Oct 2026
            </caption>
            <thead>
              <tr class="border-b border-line text-sm text-fg-2">
                <th scope="col" class="px-4 py-2.5 font-normal">Answer</th>
                <th scope="col" class="px-4 py-2.5 font-normal">Precise</th>
                <th scope="col" class="px-4 py-2.5 font-normal">Complete</th>
                <th scope="col" class="px-4 py-2.5 font-normal">Keyword rules before</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-line">
                <th scope="row" class="px-4 py-3 font-medium">Sponsors</th>
                <td class="px-4 py-3">100%</td>
                <td class="px-4 py-3">100%</td>
                <td class="px-4 py-3 text-fg-2">33% · 90%</td>
              </tr>
              <tr class="border-b border-line">
                <th scope="row" class="px-4 py-3 font-medium">Won't sponsor</th>
                <td class="px-4 py-3">98%</td>
                <td class="px-4 py-3">96%</td>
                <td class="px-4 py-3 text-fg-2">90% · 37%</td>
              </tr>
              <tr class="border-b border-line">
                <th scope="row" class="px-4 py-3 font-medium">Helps you move</th>
                <td class="px-4 py-3">95%</td>
                <td class="px-4 py-3">98%</td>
                <td class="px-4 py-3 text-fg-2">not measured</td>
              </tr>
              <tr>
                <th scope="row" class="px-4 py-3 font-medium">Language required</th>
                <td class="px-4 py-3">100%</td>
                <td class="px-4 py-3">100%</td>
                <td class="px-4 py-3 text-fg-2">not measured</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
          The keyword rules were right a third of the time on Sponsors, so we never show them. The sample is
          small: 22 of the 200 postings offer a visa, so even a perfect score means the true rate could be as
          low as about 85%. The language check was tuned on the same 200 postings, so expect a little less on
          new ones. The set grows as we label more.
        </p>
        <p class="font-mono text-mono text-muted">
          visas: Claude Opus 5.5, prompt v1, 23 Oct 2026 · languages: Claude Sonnet 5.5, prompt v2, 24 Oct
          2026
        </p>
      </section>

      <section id="limits" aria-labelledby="limits-title" class="flex scroll-mt-6 flex-col gap-4">
        <h2 id="limits-title" class="text-xl font-medium md:text-2xl">What it can't do</h2>
        <ul class="m-0 flex list-none flex-col p-0">
          <li
            v-for="c in CANT"
            :key="c.k"
            class="flex flex-col gap-1 border-b border-line py-3.5 sm:flex-row sm:gap-5"
          >
            <span class="text-[15px] font-medium sm:w-[280px] sm:flex-none">{{ c.k }}</span>
            <span class="text-[15px] leading-[23px] text-fg-2 text-pretty">{{ c.t }}</span>
          </li>
        </ul>
        <div class="flex flex-col gap-1.5 rounded-card border border-dashed border-unknown-line p-4">
          <h3 class="text-[17px] font-medium">Not legal advice</h3>
          <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
            Rules and salary minimums change, often every January. Confirm with the employer and the official
            sources before you move.
          </p>
        </div>
      </section>

      <section id="companies" aria-labelledby="companies-title" class="flex scroll-mt-6 flex-col gap-3">
        <h2 id="companies-title" class="text-xl font-medium md:text-2xl">For companies</h2>
        <p class="text-[15px] leading-[23px] text-pretty">
          Your roles are here because your job board is public. We show a sentence or two as quotes and link
          to your posting; we never republish it. To fix an answer or remove your roles, write to
          <a :href="`mailto:${email}`" class="underline underline-offset-[3px]">{{ email }}</a
          >. We act on it within a week.
        </p>
        <p class="text-[15px] leading-[23px] text-fg-2 text-pretty">
          No ads and no paid placement: nobody pays to rank higher.
          <UiExternalLink
            href="https://github.com/azamatos/visaproof"
            class="underline underline-offset-[3px]"
            >The code is public</UiExternalLink
          >.
        </p>
      </section>
    </article>
  </main>
</template>
