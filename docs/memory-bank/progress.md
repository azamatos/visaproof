# Roadmap

**Updated 2026-10-27.** Target: **MVP live on Friday 2026-10-30**. The design came early (2026-10-23) and the
extractor clears the bar on the owner's subscription, so from Monday the site is built straight to the design.
Public launch (sharing it) follows when the owner is happy with it.

## Week plan

| Day        | Agent                                                                                                                                                                                                                | Owner                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Fri Oct 23 | Done: alerts, labelled set, scorer, extractor, model choice (Opus 5.5), design brief                                                                                                                                 | Done: Telegram bot, Claude token, the name, the design                   |
| Sat Oct 24 | Done: cron fixes, clearer Telegram messages, register review (200 employers), official amounts, language check, `role_answer`, the site's search page (live search, filters, themes), the preview deployed (noindex) | Done: design decisions, hosting confirmed, DNS record                    |
| Sun Oct 25 | Done: the review's fixes (board dates, technology search, per-country "Can sponsor"), job page, Method, Status, company and country pages, company names, browser tests in CI, CSP, docs                             | Done: decided search matching, names, country pages, corrections address |
| Mon Oct 26 | Done: code review (15 fixes), merged (PR #1) and deployed; Lighthouse on production 96–100. Next: spot-check corrections                                                                                             | Spot-check about 20 register reviews and the flagged names (15 minutes)  |
| Tue Oct 27 | Done: share images, sitemaps, robots, canonical links; indexing on. Next: `docs/learning/` notes; more boards that post for others                                                                                   | —                                                                        |
| Wed Oct 28 | Polish                                                                                                                                                                                                               | —                                                                        |
| Thu Oct 29 | Fixes from the owner's review                                                                                                                                                                                        | Review the preview on a phone and a desktop                              |
| Fri Oct 30 | MVP done                                                                                                                                                                                                             | —                                                                        |

Every deploy updates the site at visaproof.azamatos.com, open to search engines since 2026-10-27.

## Status

| Milestone                                      | Target   | Status                                                         |
| ---------------------------------------------- | -------- | -------------------------------------------------------------- |
| Idea and plan                                  | —        | done 2026-10-17                                                |
| M0 Setup and real data                         | Oct 23   | done 2026-10-23                                                |
| M1 Evidence: extraction, evaluation, registers | Oct 25   | done except the backfills (nightly) and the owner's spot-check |
| M2 Design (owner, Claude Design)               | Oct 27   | done 2026-10-23; decisions 2026-10-24                          |
| M3 Site                                        | Oct 30   | built 2026-10-25, deployed 2026-10-26, indexed from 2026-10-27 |
| M4 Launch                                      | November | indexing on 2026-10-27; sharing when the owner is happy        |
| M5 After launch                                | —        | later                                                          |

## M0: setup and real data (done 2026-10-23)

- [x] Repo `azamatos/sponsored` (now `azamatos/visaproof`), pnpm workspace, TypeScript strict, ESLint
      (`strictTypeChecked`), Prettier, Vitest, CI with a Docker image build (2026-10-23)
- [x] Pipeline: adapters for Ashby, Greenhouse, Lever, SmartRecruiters, Personio, Recruitee, Workable, Workday;
      location and role rules; regex signals; Postgres schema; ingest with closing and an empty-board guard
      (2026-10-22)
- [x] On the server: Docker Compose, systemd timers (ingest every 6 h, registers daily, discovery weekly) (2026-10-22)
- [x] Registers loaded: IND 13,024 sponsors, UK 122,353 Skilled Worker sponsors (2026-10-22)
- [x] Discovery from Common Crawl's columnar index (DuckDB); the CDX query server times out on big hosts (2026-10-23)
- [x] First full sweep of every discovered board; `docs/findings.md` with the numbers (2026-10-23)
- [x] Each adapter tested against a saved real response (2026-10-23)
- [x] Nightly `pg_dump`, kept 7 days (2026-10-23)
- [x] Fixes from the sweep: one row per board, a request queue per site, US state codes (2026-10-23)
- [x] Alerts when a run fails or a board type fails as a group: Telegram, live (2026-10-23)

Done when the findings are written (2026-10-23); the timers keep running unattended, with alerts.

## M1: evidence (target Oct 25)

- [x] Labelled set: 200 postings in four strata from discovered boards, labelled by agents with one guide
      (`apps/pipeline/eval/`) (2026-10-23)
- [ ] Owner review of the "offers", "maybe" and "refuses" labels: optional now that Opus scores 100% / 100% on
      "offers"; the ~18 disagreements left are hard cases
- [x] Scorer, with the regex baseline: "offers" 33% precise, "refuses" 90% precise but 37% recall (2026-10-23)
- [x] Extractor: excerpts of the postings that mention visas, 20 per call through Claude Code on the owner's
      subscription, JSON schema, quote verification; model and prompt version stored per extraction (2026-10-23)
- [x] Models compared on the labelled set: all clear the bar; Opus 5.5 chosen (100% / 100% on "offers")
      (2026-10-23)
- [ ] Backfill every open role that mentions visas, then only new or changed ones. Night 1 (2026-10-24): 1,500
      postings in 10 minutes, no failed calls, no quote dropped; about 1,670 left
- [x] Register review: the 100 companies with the most NL roles and the 100 with the most UK roles, reviewed by
      agents with evidence (`apps/pipeline/reviews/registers.jsonl`): 142 listed, 40 not listed, 18 unsure; loaded
      (2026-10-24). "Can sponsor" went from 170 roles to about 2,130
- [ ] Owner spot-checks about 20 of the reviews, the medium-confidence ones first
- [x] The Blue Card, IND and UK amounts checked at their official sources; all our figures were right; stored
      with their sources in `visa_rule` (2026-10-24). The UK salary check waits until after launch
- [x] Language check for every role (`src/languages.ts`, Sonnet): 200 of 200 exact on the labelled set with prompt
      v2 (2026-10-24); nightly after the visa extraction, about 3,000 postings a night until all are read
- [x] The five visa states per role in one SQL view, `role_answer` (migration 006) (2026-10-24)

Done when every open role has visa and relocation facts with verified quotes, the scorer passes the bar, and the
register status is confirmed for the top companies.

## M2: design (owner, done 2026-10-23)

- [x] Design brief (agent): `docs/design-brief.md`, with the real numbers and extracted examples (2026-10-23)
- [x] Screens in Claude Design (owner): 27 boards with all six screens on phone and desktop and their loading,
      empty and error states, the components and the tokens (2026-10-23). The canvas is in the owner's Claude
      account (private)
- [x] Decisions (owner, 2026-10-24): accent "Visa blue" `#76beff` with orange `#f99f5d` for refusals; a light
      theme that follows the device, with a System / Dark / Light switch in the footer; corrections go to
      `visaproof@azamatos.com`, forwarded by Cloudflare Email Routing

## M3: site (target Oct 30)

- [x] `apps/web` started (2026-10-24): Nuxt 4, Tailwind CSS 4, Reka UI; the design's tokens (dark and light),
      VisaChip, RelocChip, JobCard, header, footer with the theme switch, search with every filter and its counts
      (sidebar on a desktop, sheet on a phone), `/api/roles`
- [x] Job page with the evidence panel and "Report a wrong answer"; company and country pages (full guides for
      Germany, the Netherlands and the UK); `/method`; `/status` with a stale notice on every page; a 404 page
      (2026-10-25, deployed 2026-10-26)
- [x] Search: title word, company and technology (a dictionary of 119 with aliases), the board's posting date,
      per-country "Can sponsor"; state in the URL; 0.1 s instead of 1 s (2026-10-25)
- [x] Company names for the 200 biggest boards that send none, reviewed by agents (2026-10-25)
- [ ] `docs/learning/` notes
- [x] On the server in Docker behind its front door (`/srv/edge/sites/sponsored.caddy`), Cloudflare in front, a
      read-only database user: a preview is live at visaproof.azamatos.com with `noindex` (2026-10-24)
- [x] Corrections go to `hi@azamatos.com` (owner, 2026-10-25; already routed, no DNS change)
- [x] Playwright + axe in CI: 51 browser tests on a phone and a desktop, dark and light (2026-10-25)
- [x] Lighthouse ≥ 95 on a phone in production: performance 96–100 on search, a job, a company, Germany and
      Status; accessibility 100 (2026-10-26)
- [x] Merged (PR #1, after a code review: 15 fixes) and deployed (2026-10-26)

Done when a visitor can find visa-friendly roles, see why each answer was given, and click through to apply.

## M4: launch (indexing on 2026-10-27; sharing when the owner is happy)

- [x] Ready for search engines and link previews: share images, sitemaps, canonical links, robots, the site's
      name (2026-10-27)
- [x] Indexing on (owner, 2026-10-27): `INDEXABLE` is on in `deploy/compose.yml` (`INDEXABLE=false` in the
      server's `.env` turns it off)
- [ ] The sitemap (`https://visaproof.azamatos.com/sitemap.xml`) added in Google Search Console and Bing Webmaster
      Tools (the owner's accounts; a Domain property for `azamatos.com` already covers the subdomain, otherwise
      verifying is a DNS record or a meta tag)

- [x] README: screenshots, how it works, accuracy, what it's built with, how to run (2026-10-27)
- [x] The public Telegram channel's daily post, built (2026-10-27); live once the owner creates the channel
- [ ] Share images redesigned (owner, Claude Design), then rebuilt
- [ ] `/method` with the measured accuracy and known limits
- [ ] Competitors re-checked (`projectbrief.md`)
- [ ] Shared where relocating developers are: subreddits and Telegram channels that allow it, LinkedIn (owner)

## M5: after launch (only with real users)

- Alerts for saved searches (email or Telegram)
- "Suggest a company" form
- Staffing agencies and aggregators flagged, so the agency isn't read as the sponsor
- Sponsorship history per company ("posted 12 visa-friendly roles this year")
- Denmark (SIRI) and Ireland (DETE) registers; the UK salary check (going rates per occupation); country guides,
  sourced and dated
- Lever boards beyond the seed list (Common Crawl doesn't crawl Lever's main host); more Workday employers
- Salary insights from posted ranges

## Done log

- 2026-10-17: idea agreed with the owner; README, AGENTS.md and memory bank written.
- 2026-10-22: pipeline built and running on the server; first run from the server read all 174 seed boards in
  2 minutes (1,803 engineering roles in Europe); registers loaded.
- 2026-10-23: repo on GitHub with CI; discovery moved to Common Crawl's columnar index; first full sweep of
  16,353 boards; adapter fixtures; nightly backups; duplicate boards merged, per-site rate limits, US state codes
  fixed; `docs/findings.md` written.
- 2026-10-24: first extraction night (1,500 postings). Design received from the owner. Workday's weekly
  maintenance failed one run as a group: runs in its window now skip Workday, a group alert needs two failed reads
  in a row, and quiet boards are re-read in weekly slots (12,500 were due on one run on Oct 30). Telegram messages
  redone: 🚨 alerts with the error, what it means and what's next; ✅ when a unit works again; a daily summary
  with 🟢 🟡 🔴 per part.
  Evening: the register review for the 200 biggest NL and UK employers (agents, with evidence), the official
  salary minimums checked at their sources, the language check (200 of 200 on the labelled set), the five visa
  states as a view, and the site started in Nuxt: search with filters, matching the design.
  Late evening: live search, our own dropdown, links to other sites in a new tab; the repo renamed to
  `azamatos/visaproof`; the site deployed to the server, live at visaproof.azamatos.com as a `noindex` preview.
- 2026-10-25: a review of the project and the plan; the owner agreed with all of it. Fixed: board dates for
  "posted" (64% of roles were posted over 30 days before the pipeline first saw them), search that missed "C++",
  "C#" and ".NET", "Can sponsor" per country, places that paired a city with the wrong country. Built: the
  technology dictionary, the job page with its evidence, Method, Status, company and country pages, a 404 page,
  reviewed names for the 200 biggest unnamed boards (6 post for others), browser tests with axe in CI, a content
  security policy, API caching. The docs now describe what's built.
- 2026-10-26: PR #1 reviewed (15 issues fixed: reviewed names that couldn't be corrected, a country code matched
  inside "Île-de-France", stale-while-revalidate hiding the stale notice, status counting failed runs as on time,
  company pages limited to 50 roles, and smaller ones), CI green, merged and deployed. Lighthouse on a phone in
  production: performance 96–100, accessibility 100.
- 2026-10-27: search engines and link previews: a share image for every page (the role's, company's or country's
  own), sitemaps of the open roles, companies and countries, canonical links, robots.txt, the site's name in search
  results. A code review (14 fixes: 503 instead of noindex when the API fails, one canonical link per page, the
  company image following its page, HEAD for the sitemaps, a cache for the images). The owner decided to open
  indexing now: on from 2026-10-27, deployed; Lighthouse SEO 100 in production.
