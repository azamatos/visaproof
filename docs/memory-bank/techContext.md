# Technical plan

**Updated 2026-10-27.** Built: the pipeline (ingest, registers, discovery, extraction, language check,
technologies, alerts) on the server, and the site (search, job, company and country pages, method, status), live
and open to search engines since 2026-10-27. Planned: what `progress.md` lists after the MVP.

## Shape

```
company job boards ──┐            Common Crawl index ──┐ weekly
                     ▼                                 ▼
   pipeline (apps/pipeline), Docker on the server, systemd timers
     ingest every 6 h: read due boards → engineering roles in Europe → new / changed / closed → technologies
     registers daily:  IND + UK registers → automatic candidates; reviewed entries decide
     discover weekly:  Common Crawl → new boards (read once, kept if they have roles for us)
     extract nightly:  postings that mention visas → Claude Opus 5.5 → facts with verified quotes;
                       every posting → Claude Sonnet 5.5 → languages it requires
                     ▼
              Postgres 18 (same server, no public port) → role_answer view: one answer per role
                     ▼
   website (apps/web, Nuxt): search, job, company and country pages, method, status; reads as a read-only user
```

The pipeline and the site share only the database, so either can be rebuilt without touching the other. One
exception: the channel's daily post reads the site's search (below, decisions).

## Decisions taken (reversible, with the reason)

| Decision                                                                                                                                     | Why                                                                                                                                                      | Instead of                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Pipeline and Postgres on the owner's server (Docker, systemd timers, `Persistent=true`)                                                      | No time limits, no laptop sleep, no cold database; runs every 6 h for free. A missed run starts at boot.                                                 | GitHub Actions cron + Neon (scheduled runs get delayed and switch off after 60 days without commits) |
| Node runs the TypeScript directly (type stripping)                                                                                           | No build step for a CLI; `tsc` only type-checks                                                                                                          | A bundler                                                                                            |
| Plain SQL migrations + the `postgres` client                                                                                                 | Bulk upserts and a small schema; nothing an ORM adds yet                                                                                                 | Drizzle (still fine for the site later)                                                              |
| Read each board in one request where possible (Greenhouse `content=true`, Workable `details=true`)                                           | ~10× fewer requests than one per job                                                                                                                     | Per-job detail calls                                                                                 |
| Common Crawl for discovery                                                                                                                   | Finds the boards nobody listed by hand, using public data, one request per board to check                                                                | A hand-kept company list only                                                                        |
| Keep only engineering roles in scope countries; keep their full text privately                                                               | Small database, and the text is needed for extraction and evaluation                                                                                     | Storing every posting                                                                                |
| Visa sponsorship and relocation support are two separate facts                                                                               | Most "relocation package" postings say nothing about visas (`docs/findings.md`)                                                                          | One "visa" verdict                                                                                   |
| Auto register matches are candidates, not answers                                                                                            | Name matching links "Wise" to "Wise K9 Ltd" (`docs/findings.md`)                                                                                         | Showing name matches                                                                                 |
| `role_answer` stays a view, not a table refreshed by the pipeline                                                                            | Measured 2026-10-25: about 46 ms a query; the slow part of search was the regex over the posting text, now gone                                          | A materialised table and a refresh after every job                                                   |
| Search by title word, company name and a technology dictionary, not the posting's text                                                       | 0.1 s instead of about 1 s for a whole search, and precise ("C++" and ".NET" found no text before)                                                       | Full-text or regex search over descriptions                                                          |
| API answers cached 5 minutes per URL (status 60 s) in a bounded LRU, in production only                                                      | The data changes every 6 hours at most; a bounded cache can't be filled by many different searches                                                       | No cache, or Cloudflare cache rules (a DNS-side change)                                              |
| "Report a wrong answer" is an email from the visitor's mail app to the corrections address                                                   | The site's database user only reads; no form endpoint, no mail service, no stored personal data                                                          | A form that writes to the database                                                                   |
| Visa mentions kept per posting as a generated column (`posting.mentions`)                                                                    | Counting them ran the pattern over every text (3.3 s); now 0.09 s                                                                                        | The pattern at query time                                                                            |
| Share images drawn by the site itself (Satori + resvg, `server/og/render.ts`)                                                                | One per role, company and country from the same API answers; about 0.15 s each, cached a day by Cloudflare                                               | nuxt-og-image (more moving parts on Nuxt 4 and Vite 8), or one static image for every page           |
| No JobPosting structured data                                                                                                                | Google wants the posting's full text in it, and the site doesn't republish postings (AGENTS.md rule 3)                                                   | JobPosting markup with a summary (risks being treated as incomplete or spammy markup)                |
| Indexing is one setting in the site (`NUXT_PUBLIC_INDEXABLE`, on in `deploy/compose.yml`)                                                    | The robots header, meta tag and robots.txt follow it together, and the browser tests check the "off" state                                               | The X-Robots-Tag line in the Caddy file                                                              |
| The channel's post reads the site's search (`/api/roles`, which also returns each role's countries, city and remote reach), not the database | Places, pay and answers read exactly as on the site, and the post groups roles by country without a second copy of the site's formatting in the pipeline | Querying `role_answer` in the pipeline                                                               |

## Packages

| Path                             | Job                                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/pipeline/src/adapters/`    | One file per board type, all returning `RawPosting`. Boards without texts in the list (SmartRecruiters, Workday) fetch a job's text only when it's new. |
| `src/location.ts`                | Free-text location → countries, on-site / hybrid / remote and remote scope. Remote with no region is dropped (on a US board it means the US).           |
| `src/roles.ts`                   | Title → role family (frontend … management) or not software; seniority.                                                                                 |
| `src/signals.ts`                 | Regex visa / no-visa / language hits, salary ranges, and `MENTIONS_RE`, the extractor's pre-filter. Baseline and pre-filter only.                       |
| `src/technologies.ts`            | The technology dictionary (119 entries with aliases) and its matcher; `cli.ts technologies` reads postings an older dictionary read.                    |
| `src/ingest.ts`                  | Which boards are due, upsert (with technologies), close what disappeared. A board that suddenly lists nothing keeps its roles open.                     |
| `src/registers.ts`               | IND HTML table and UK CSV → `register_entry`; automatic candidates; reviewed statuses (`reviews/registers.jsonl`).                                      |
| `src/companies.ts`               | Reviewed names for boards that don't send one, and boards that post for others (`reviews/companies.jsonl`).                                             |
| `src/discover.ts`                | Seed lists and Common Crawl → `company` rows with status `new`.                                                                                         |
| `src/extract.ts`                 | Visa and relocation facts through Claude Code in print mode, quotes verified.                                                                           |
| `src/languages.ts`               | Languages each role requires, for every open posting.                                                                                                   |
| `src/evaluation.ts`, `eval/`     | The 200 labelled postings, the sampler and the scorer.                                                                                                  |
| `src/digest.ts`, `src/report.ts` | The daily Telegram summary; the numbers in `docs/findings.md`.                                                                                          |
| `src/channel.ts`                 | The public Telegram channel's daily post of the new roles that sponsor (`deploy/channel.sh` sends it).                                                  |
| `apps/web/server/api/`           | `roles` (search), `jobs/[id]`, `companies/[ats]/[...slug]`, `countries/[code]`, `stats`, `status`.                                                      |
| `apps/web/shared/`               | What both sides use: answer states and labels, evidence rules (`evidence.ts`), status rules (`status.ts`), country guides (`guides.ts`), formats.       |
| `apps/web/app/`                  | Pages, components (`ui/` are the reusable ones), composables.                                                                                           |
| `apps/web/e2e/`                  | Browser tests and the made-up test data (`seed.sql`).                                                                                                   |

Board status: `new` → read once → `active` (has roles for us; read every run), `idle` (works, nothing for us;
re-read weekly), `gone` (404; re-read monthly).

## Data model (as built, `apps/pipeline/migrations/`)

```
company           id, ats, slug, eu, name, origin, status, checked_at, ok_at, error, errors_in_row, total_jobs,
                  kept_jobs, posts_for_others, name_reviewed                      unique (ats, slug, eu)
posting           id, company_id, external_id, url, title, family, seniority, location_raw, countries[], work_mode,
                  remote_scope, posted_at, first_seen_at, last_seen_at, changed_at, closed_at, content_hash,
                  description (private), salary_raw, pay, signals, technologies[], technologies_version,
                  mentions (generated)                                            unique (company_id, external_id)
register_entry    register (nl_ind | uk_worker), name, core, extra, fetched_at
company_register  automatic candidates (method auto | override)
register_review   company_id, register, verdict (listed | not_listed | unsure), entry_name, evidence, reviewed_by
extraction        posting_id, content_hash, prompt_version, requested, model, visa, visa_quote, relocation,
                  relocation_quote, languages, dropped         one row per posting text, prompt and model
extraction_call   tokens, time and API-equivalent cost per call
language_check    posting_id, content_hash, prompt_version, requested, model, languages, quote, written_in
visa_rule         country, rule, amount, currency, period, applies_from, source_url, checked_on
technology        key, label, search[] (every name, lower case)
run, source_result  every job's runs; each board's result per ingest
role_answer       (view) one answer per role: visa state and rank, can_in (countries where "Can sponsor" holds),
                  quotes, register verdicts, relocation, languages
mentions_visa()   (function) MENTIONS_RE in SQL; a test keeps the two the same
```

## Sources (checked 2026-10-17, confirmed working from the server 2026-10-22)

| Board           | Endpoint (GET unless noted)                                                                                                         | Text in the list                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Ashby           | `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true`                                                             | yes, plus structured salary                                    |
| Greenhouse      | `boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true` (also serves boards hosted on `job-boards.eu.greenhouse.io`)          | yes                                                            |
| Lever           | `api.lever.co/v0/postings/{slug}?mode=json` (EU: `api.eu.lever.co`)                                                                 | yes                                                            |
| SmartRecruiters | `api.smartrecruiters.com/v1/companies/{slug}/postings`, then `/postings/{id}`                                                       | no: one request per new role                                   |
| Personio        | `{slug}.jobs.personio.de/xml?language=en` (every board is also on `.com`)                                                           | yes (XML)                                                      |
| Recruitee       | `{slug}.recruitee.com/api/offers/`                                                                                                  | yes                                                            |
| Workable        | `apply.workable.com/api/v1/widget/accounts/{slug}?details=true` (undocumented)                                                      | yes                                                            |
| Workday         | POST `{host}/wday/cxs/{tenant}/{site}/jobs` searching "software", "developer", "engineer", then one GET per new role (undocumented) | no                                                             |
| Common Crawl    | Columnar index (Parquet on `data.commoncrawl.org`), read with DuckDB by SURT key range per host                                     | — the CDN answers 403 when busy: retried 2 and 4 minutes later |

Not used: LinkedIn, Indeed, Glassdoor (terms), big-tech career sites and aggregators (their listings, their terms;
check before adding).

| Register                                                                                        | Where                                                                                                                  | Format                                        | Updated           |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------- |
| NL: IND public register "Work" (13,024 on 2026-10-22)                                           | `ind.nl/en/public-register-recognised-sponsors/public-register-work`                                                   | One HTML table: organisation, KvK number      | Monthly           |
| UK: Worker and Temporary Worker licensed sponsors, Skilled Worker route (122,353 on 2026-10-22) | CSV linked from `gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers` (file name changes) | CSV: name, town, county, type & rating, route | Most working days |
| DK: SIRI fast-track certified companies (~990)                                                  | `nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Certified-companies`                                                      | HTML table: name, CVR                         | Later             |
| IE: DETE employment permits by company                                                          | `enterprise.gov.ie/en/publications/employment-permit-statistics-2026.html`                                             | XLSX per year                                 | Later             |

A register load that shrinks by more than 20% is rejected and the old copy kept.

## Register matching

Automatic name matching is only a candidate list ("Wise" matches 20 UK entries). A company counts as on a
register only through `register_review`: an agent or the owner names the entry with evidence (its legal name in
the postings or on its site, a company registry number), and the entry must still be on the register, which
reloads daily. The first round covers the 100 biggest employers in each of the Netherlands and the UK
(2026-10-24). Everyone else is "not checked yet".

## Extraction

1. **Pre-filter:** only postings that mention visas, relocation, permits or the right to work (`MENTIONS_RE`,
   about 22%) are read for visas; the rest are silent by construction. The excerpt is the matching lines with
   their neighbours.
2. **Visa and relocation:** Claude Opus 5.5 through Claude Code in print mode on the owner's subscription (no API
   billing), 20 postings a call, a JSON schema: `visa` and `relocation` as offers / maybe / refuses / silent, each
   with one verbatim quote. A quote not found in the posting (allowing for whitespace and quote marks) is dropped
   with its fact. Prompt `prompts/extract-v1.md`.
3. **Languages:** a second pass with Claude Sonnet 5.5 for every open posting; postings with no line about
   languages, written in English, are stored without a call. Prompt `prompts/languages-v2.md`.
4. Both run nightly at 01:00 UTC and stop at the first usage-limit error. Extractions count for the posting's
   current text and the prompt in use: a new prompt means a new version of `role_answer`.

## Evaluation

- `eval/labels.jsonl`: 200 postings in four strata, labelled field by field with the evidence sentence.
- `cli.ts eval-score` and `eval-languages`: precision and recall per answer, weighted by stratum; rules vs. model.
- Bar: precision ≥ 95% for `visa = offers` before a prompt or model change ships. Results in `docs/findings.md`
  and on `/method`.

## Website

- **Framework:** Nuxt (Vue 3), chosen by the owner on 2026-10-23 as a new skill with demand: Vue is asked for in
  18% of frontend and 14% of full-stack roles in our own postings (React 72%, Angular 29%, Next.js 17%, Astro 1%),
  and the owner already ships React and Next.js. Pages render on the server; Nuxt's server routes (Nitro) query
  the local Postgres directly; the filters are a plain GET form, so their state lives in the URL and works
  without JavaScript. Earlier picks, Next.js and then Astro, were dropped: Next.js is heavier than six page types
  need and already on the owner's resume; Astro is the owner's, but teaches nothing new.
- **Components:** the site's own small design system: Tailwind tokens from the owner's design, hand-written
  components, and Reka UI (headless, accessible) for the hard widgets (the phone filter drawer, the country
  combobox, checkboxes), borrowing shadcn-vue's code where useful. No component library as a dependency: in our
  postings no UI library is a hiring signal (shadcn 1.6%, Material UI 1.8%, Vue libraries ~0%), while "design
  system" is (9.8%). Storybook after launch, optional.
  - The reusable pieces live in `apps/web/app/components/ui/` (used as `<UiSelect>`, `<UiExternalLink>`): no native
    `<select>` (`UiSelect`, on Reka's Select, renders its choice on the server too); every link to another site is a
    `UiExternalLink`, which opens a new tab and says so (an arrow, and "(opens in a new tab)" for screen readers);
    links within the site are `NuxtLink` and stay in the tab (owner, 2026-10-24).
- **Search:** a whole word in the title, a word start in the company's name, or a technology by any of its names
  (`technology.search`); filters as SQL conditions, each facet counted with the other filters applied.
- **Answers:** the pages read `role_answer`; the rules that turn it into words (evidence, status) are pure
  functions in `shared/`, with unit tests.
- **Caching:** API answers 5 minutes per URL (status 60 s) in a bounded LRU, in production only. No
  stale-while-revalidate: Nitro would serve an entry of any age to the first visitor after a quiet spell.
- **Search engines and link previews** (`shared/seo.ts`, `app/composables/usePageSeo.ts`): every page has a
  title, a description, a canonical link (searches with filters point to `/`, company pages keep `?page=`), Open
  Graph and X tags and a share image under `/og/` (the site's, or the role's, company's or country's own). Closed
  roles, company pages with no open roles, filtered searches and 404s say `noindex`. Sitemaps (`/sitemap.xml` →
  pages, companies, jobs) list only open roles and the companies and countries that have them; robots.txt keeps
  crawlers out of `/api/`. The home page names the site for search results (WebSite in JSON-LD). Indexing is on
  on the server since 2026-10-27; with it off (the default, so local runs and tests) every page and response says
  `noindex, nofollow`. Lighthouse SEO 100 with it on
  (2026-10-27, local build).
- **Learning notes:** `docs/learning/`, one short note per concept the first time it appears in the code (the
  owner learns Nuxt and Vue from this codebase). _Planned._
- **Hosting:** on the same server in Docker behind its Caddy front door, Cloudflare proxying the domain; it reads
  the local Postgres as a read-only user (decided 2026-10-23).
- **Quality:** WCAG 2.2 AA (axe in the browser tests, dark and light), Lighthouse ≥ 95 on a phone.

## Ops

- Deploy: `deploy/deploy.sh` (`deploy/README.md`). CI: types, lint, format, tests, Docker image build.
- Every run writes `run` and `source_result`; `report` shows failures by board type.
- **Alerts:** a failed unit, or an ingest where a board type fails as a group, sends its last log lines to the
  owner on Telegram (`deploy/alert.sh`, `deploy/README.md` → Alerts).
- **Public channel:** a daily Telegram post of the new roles that say they sponsor a visa or may, each linking to
  its page on the site (`src/channel.ts`, `deploy/channel.sh`, `deploy/README.md` → The public channel). It reads
  the site's own search (`/api/roles` on the compose network), so the channel says what the site says; the
  `channel_post` and `channel_item` tables keep any role from being posted twice.
- Backups: nightly `pg_dump` to `/srv/sponsored/backups`, kept 7 days (`deploy/backup.sh`); the database can also
  be rebuilt from the boards in about two hours, except history (first seen, closed).
- Requests are queued per site (`acme.recruitee.com` and `beta.recruitee.com` share one queue): 2 at a time,
  300 ms apart; Workable 1 a second, because it answered the first sweep with 429s.

## Tests

- Pipeline (Vitest): rules (`test/rules.test.ts`), including the technology matcher and the SQL pattern; each
  adapter against a saved real response (`test/fixtures`).
- Site (Vitest): formats, search patterns, evidence and status rules (`apps/web/test`).
- Browser (Playwright + axe, `apps/web/e2e`): search, job, company, country, method, status and 404 pages, the
  share images, sitemaps and robots (`seo.spec.ts`) on a phone and a desktop, against a test database of made-up roles built by the pipeline's own migrations. CI runs them
  against Postgres 18.
