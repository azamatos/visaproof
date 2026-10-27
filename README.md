# Visaproof

Visa-friendly developer jobs in Europe, with the evidence for every answer:
[visaproof.azamatos.com](https://visaproof.azamatos.com).

> **Status: live.** The data pipeline runs every 6 hours and the site is open to search engines since
> 2026-10-27: search, job pages with the evidence, company and country pages, method and status. The repo keeps
> its working name, `sponsored`.

A free job finder for software developers who need a visa to work in Europe. It reads open roles straight from
companies' own job boards and answers the questions a relocating developer asks first, with proof:

- **Will they sponsor a visa? Will they help me relocate?** Two separate answers, each with the exact sentence
  from the posting ("we sponsor visas for the right candidate") and the employer's entry in an official sponsor
  register where one exists.
- **Can I actually get the permit?** In the Netherlands only an IND recognised sponsor can hire a Highly Skilled
  Migrant. In the UK the employer needs a sponsor licence. In Germany any employer can hire on an EU Blue Card if
  the salary clears the threshold. The site checks what it can and says what it can't.
- **Do I need the local language?** "German required" is pulled out of the posting, so you can filter it away.
- **Is it still open?** Every role is re-checked against the company's board several times a day.

## How it works

```
company job boards (Ashby, Greenhouse, Lever, SmartRecruiters,     Common Crawl index
Personio, Recruitee, Workable, Workday)                            (finds new boards weekly)
                │                                                         │
                ▼                                                         ▼
     pipeline, every 6 hours (Node + TypeScript, Docker, systemd timers on a small server)
     read board → engineering roles in Europe → new / changed / closed → facts from the text
                │                         ▲
                ▼                         │ daily
            Postgres  ◀───────────  sponsor registers (Dutch IND, UK Home Office)
                │
                ▼
     website (Nuxt): search, filters, job pages with the evidence, company and country pages, method, status
```

1. A board is read in one request where its API allows it; a few boards need one more request per new role.
2. Only software engineering roles in the EU, EEA, UK and Switzerland are kept.
3. Employers are matched against the official registers.
4. A language model (Claude Opus 5.5) reads each new or changed posting that mentions visas, permits or relocation
   and returns the facts with quotes; a quote that isn't word for word in the posting is dropped. A second pass
   (Claude Sonnet 5.5) checks every posting for the languages it requires. A hand-labelled set of 200 postings
   measures both, and the numbers are on the site's Method page.
5. Each posting's technologies are recognised from a dictionary with aliases (Go = Golang, k8s = Kubernetes), so
   search finds "C++" and ".NET" and never mixes up Java and JavaScript.

What the first runs found is in [docs/findings.md](docs/findings.md).

## What it isn't

- Not legal advice. Visa rules change; the site links to official sources and shows when it last checked.
- Not a copy of the postings. It shows extracted facts and short quotes, then sends you to the original.
- Not a recruiter. No accounts, no CV uploads, no tracking beyond privacy-friendly page counts.

## Run it

Needs Node 22.18+, pnpm 10 and a Postgres database (18 on the server).

```sh
pnpm install
export DATABASE_URL=postgres://user:pass@localhost:5432/sponsored
cd apps/pipeline
node src/cli.ts migrate
node src/cli.ts seed boards.json          # [{ "ats": "greenhouse", "slug": "example" }, …]
node src/cli.ts ingest                    # read the boards
node src/cli.ts registers                 # load the IND and UK registers, match companies
node src/cli.ts technologies              # recognise each posting's technologies
node src/cli.ts report                    # the numbers, as Markdown
cd ../web
NUXT_DATABASE_URL=$DATABASE_URL pnpm dev  # the site on http://localhost:4003
```

Checks, as CI runs them: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`, and the browser tests
(Playwright and axe, against a test database of made-up roles): `pnpm --filter web e2e`.

The server setup (Docker Compose, timers, deploy) is in [deploy/README.md](deploy/README.md).

## Docs

- `AGENTS.md`: instructions for coding agents.
- `docs/memory-bank/`: the brief, product spec, technical plan, roadmap and current state.

## License

MIT. Built by [Azamat Jorayev](https://azamatos.com).
