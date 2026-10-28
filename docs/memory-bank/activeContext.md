# Active context

**Updated 2026-10-28.** Read this first. The next session starts with "Next steps" below.

## Where things stand

- **Pipeline** (on the server, `deploy/README.md`): every 6 hours it reads the job boards that are due, keeps
  software roles in the EU, EEA, UK and Switzerland, closes the ones that disappear, and recognises each posting's
  technologies (`src/technologies.ts`). Registers reload daily, discovery weekly (now recorded as a run). Nightly at
  01:00 UTC on the owner's Claude subscription: the visa extraction (Opus 5.5), then the language check (Sonnet,
  about 3,000 postings a night until all are read).
- **Answers:** the `role_answer` view gives each role one of the five visa states, relocation and languages, each
  with its evidence, and `can_in`, the countries where "Can sponsor" holds. Register reviews cover the 200 biggest NL
  and UK employers; `reviews/companies.jsonl` names the 200 biggest boards that send no name.
- **Site** (`apps/web`), all pages built to the design, merged (PR #1) and deployed on 2026-10-26: search (by title word, company and technology; the board's posting date; per-country "Can sponsor"), the
  job page with the evidence panel and "Report a wrong answer" (an email to `hi@azamatos.com`), company pages,
  country pages (full permit guides for Germany, the Netherlands and the UK; "not researched yet" elsewhere),
  Method, Status with a stale-data notice on every page, a 404 page, a content security policy, API caching.
  Live at visaproof.azamatos.com.
- **Search engines** (2026-10-27): one share image for every page (the owner's design, drawn live: decision 3
  below), sitemaps (about 15,000 open roles, 2,500 companies, the countries), canonical links, robots.txt.
  Indexing is on since 2026-10-27 (`deploy/compose.yml`). No JobPosting markup: Google wants the posting's full
  text in it, and we don't republish postings.
- **Telegram channels** (2026-10-27): [@visaproof](https://t.me/visaproof) and
  [@visaproof_ru](https://t.me/visaproof_ru) get a daily post at 07:00 UTC of the week's new roles whose posting
  says the employer sponsors (`sponsored-channel` timer, `deploy/channel.sh`, `src/channel.ts`); the first posts
  go out 2026-10-28. Each has a pinned intro post linking the other, and the site's header links to @visaproof.
  The alerts' bot posts as an admin of both.
- **Tests:** pipeline unit tests (71), site unit tests (24), browser tests with Playwright and axe on a phone and a
  desktop (69, against `e2e/seed.sql`); CI's `browser` job runs them with Postgres 18 (its Chrome install is
  sometimes slow on GitHub's side: 10+ minutes).
- **Lighthouse on a phone, production** (2026-10-26): performance search 100, job 98, company 96, Germany 99,
  Status 97; accessibility 100; SEO 100 on search, a role, a company, Germany and Method since indexing
  (2026-10-27). Best practices 96 only because this Mac's DNS
  blocks Cloudflare's analytics script (a console error in the test, not on a visitor's phone).
- The repo is `azamatos/visaproof`, public. The folder and the server paths keep the working name `sponsored`.

## Decided by the owner

2026-10-23:

1. **Language model:** no paid API; Claude Code in print mode on the owner's subscription
   (`CLAUDE_CODE_OAUTH_TOKEN` in the server's `.env`, never `ANTHROPIC_API_KEY`). Opus 5.5 for visas.
2. **Hosting:** the server, in Docker behind the shared Caddy (`/srv/edge/sites/sponsored.caddy`), Cloudflare
   proxying. Not Cloudflare Pages: the site reads the server's Postgres (asked again on 2026-10-24, confirmed).
3. **Alerts:** Telegram. **Name:** Visaproof at `visaproof.azamatos.com`. **Pace:** MVP on 2026-10-30.
4. **Site stack:** Nuxt (Vue 3), Tailwind CSS, own components on Reka UI.

2026-10-24:

1. **Design:** the owner's Claude Design canvas (27 boards; link in `CLAUDE.local.md`, private). Accent "Visa
   blue" `#76beff` (light `#0863a9`), orange `#f99f5d` (light `#a14808`) for refusals; a light theme with a
   System / Dark / Light switch.
2. **Search:** searches as you type (0.4 s, from two letters; Enter at once; an emptied box resets). "Clear all"
   clears the filters, not the search text.
3. **Links:** every link to another site opens in a new tab and says so (`UiExternalLink`); no native `<select>`
   (`UiSelect`). Rules in `techContext.md` → Website.
4. **Preview:** published now, with `noindex` until the public launch.

2026-10-25 (after a review of the project and the plan; the owner agreed with all of it):

1. **Search matches** the title, the company and a list of technologies recognised in each posting (a dictionary
   with aliases), not the posting's whole text.
2. **Company names:** agents name the biggest unnamed boards with evidence, like the register review.
3. **Country pages:** full permit guides for Germany, the Netherlands and the UK only for the MVP; other countries
   say they aren't researched yet.
4. **Corrections address:** `hi@azamatos.com` (already routed). "Report a wrong answer" writes an email to it.
5. The order of work: the review's bugs first (board dates, technology search, per-country "Can sponsor"), then
   the job page, then Method and Status, then company and country pages; browser tests come with each page.

2026-10-27:

1. **Indexing on** now, ahead of the Thursday review (search engines take days to weeks to crawl).
2. **A public Telegram channel**, [@visaproof](https://t.me/visaproof), with a daily post of the new roles that say
   they sponsor (`deploy/README.md` → The public channel). Created by the owner; set up and deployed 2026-10-27,
   first post 2026-10-28 at 07:00 UTC. Its layout follows an established relocation channel the owner forwarded
   (one line per role, grouped by country, hashtags), with the visa evidence theirs lacks. Each channel has a pinned
   post that links to the other (owner's approval, 2026-10-27), and the site's header links to @visaproof (the
   owner's design board "Telegram · link in the header"). A bot with personal alerts only if the channel draws
   people; no group for now (moderation).
3. **Share images and icons** come from the owner's Claude Design (2026-10-27): one share image for every page
   (`/og/site.png`, drawn live from that design with the numbers and the three newest roles that sponsor), and the
   favicons and app icons. A per-role or per-company image only from a design of the owner's.
4. **A Russian channel**, [@visaproof_ru](https://t.me/visaproof_ru), with the same daily post in Russian (the
   example channel's audience); each channel keeps its own record of what it posted. Names, descriptions and the
   channel photo set by the agent through the bot (2026-10-27).
5. **The design export** in `docs/design/` (the owner's, for building from) stays out of git: the canvas is
   private.

## Waiting for the owner

- Google Search Console and Bing Webmaster Tools: add the site and submit
  `https://visaproof.azamatos.com/sitemap.xml`. A Domain property for `azamatos.com` already covers the subdomain;
  otherwise verifying is a DNS record (or a meta tag an agent adds). Bing can import the site from Search Console.
- LinkedIn's Post Inspector: run the home page again once Cloudflare's copies from before the fix expire (after
  about 11:30 UTC on 2026-10-28). The share image no longer says `noindex` (2026-10-28). If the image is still
  missing, look at Cloudflare's Security → Events for blocked LinkedIn requests. Author and publish date are only
  informational in Post Inspector (the card doesn't show them); the site sets neither.
- Thu Oct 29: review the site on a phone and a desktop.
- Optional: a share image per role or company, if the owner designs one (every page uses the site's now).

## Next steps (in order)

1. After 07:00 UTC on 2026-10-28: check the first channel posts went out to both channels
   (`journalctl -u sponsored-channel`, the channels themselves) and read them as a subscriber would.
2. Once the owner has added the site to Search Console: what Google indexes (its Pages report). Closed roles
   should drop out; short job pages may stay "crawled, not indexed", the company and country pages matter more.
3. Boards that post for others beyond the 6 flagged: find more (staffing agencies, aggregators), and decide whether
   their register answers should count at all.
4. `docs/learning/` notes for the owner (Nuxt and Vue concepts as they appear in the code).
5. Polish from the owner's Thursday review.
6. Update this file and `progress.md`.

Method for register and name reviews: the register first; when unsure, the company's site (the board's logo links
to it), then decide (`reviews/README.md`).

## Open questions

- Lever: Common Crawl has no URLs for `jobs.lever.co`, so only the seed list and the EU host cover Lever.
- Workday: only the seed tenants are read; discovering more costs dozens of requests per tenant.
- Register reviews cover the 200 biggest employers; the rest stay "not checked yet" unless the posting says
  something. Groups with several entities (some listed, some not) are marked unsure.
- UK going rates per occupation code aren't researched (the UK salary check waits until after launch).
- The language check fills over the next nights; until then "No local language" and the country pages' language
  numbers cover only the postings read so far (they say so).
- The technology matcher still gets "Unity" wrong about 2 times in 6 (a company value, a C test framework).
- Proposed, not decided: an RSS feed of the channel's roles; a Telegram bot with personal alerts once the channels
  draw people (M5); landing pages from real data ("companies that sponsor in Germany") where there are enough
  roles.

Settled earlier: the eval bar is precision ≥ 95% for "offers"; countries at launch are the EU, EEA, UK and
Switzerland, with Germany done best; the repo is public from day one.
