# Product spec

Updated 2026-10-25. The agreed behaviour for the MVP; "later" items are in `progress.md`. The pipeline and the
site are built; the site is a preview until the public launch.

## Who uses it

Software developers outside the EU who want a job in Europe and need the employer to sponsor a work permit:
frontend, backend, full-stack, mobile, data and DevOps engineers, mostly mid-level to senior. They are good at
their jobs and bad at guessing which postings are realistic for them. Today they open every posting, search it
for "visa", look up the employer in a register, and still don't know.

## The questions it answers, per role

1. **Visa:** does the posting offer sponsorship or relocation, refuse it, or say nothing? With the quote.
2. **Permit route:** for the role's country, can this employer actually sponsor? (Register check where one exists.)
3. **Language:** is German, Dutch, French or another local language required, or only nice to have?
4. **Fit:** role type, seniority, stack, work mode (on-site, hybrid, remote and from where).
5. **Money:** the salary range when the posting gives one, and for Germany whether it clears the Blue Card threshold.
6. **Freshness:** when it was first seen, last checked, and whether it's closed.

## Verdicts

Two separate facts per role, because they're different promises (most "relocation package" postings say nothing
about visas, `docs/findings.md`):

| Fact                   | Values                    | Shown as                                                                      |
| ---------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| **Visa sponsorship**   | offers / refuses / silent | ✓ "Sponsors visas", ✗ "No sponsorship", or "Doesn't say", each with the quote |
| **Relocation support** | offers / refuses / silent | ✓ "Helps you relocate", ✗, or nothing, with the quote                         |

Then the employer check for the role's country:

| Register status     | When                                                                                               | Shown as                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Listed**          | The employer's entity is confirmed on the country's register (`techContext.md`, register matching) | "IND recognised sponsor" / "UK licensed sponsor", with the entry name     |
| **Not listed**      | Confirmed absent                                                                                   | NL: red warning, the Highly Skilled Migrant route is closed. UK: warning. |
| **Not checked yet** | No confirmed match either way                                                                      | "Register not checked yet"                                                |
| —                   | Countries without a register (Germany and most others)                                             | The country note instead (Blue Card salary check for Germany)             |

The headline badge combines them: "Sponsors visas" only when the posting says so; "Licensed sponsor, posting
doesn't say" when only the register speaks; "Doesn't say: ask the recruiter" otherwise. A refusal always wins.

A quote must be an exact substring of the posting text. If the extractor's quote isn't found, it's dropped.
Rule-based regex hits are never shown: they're wrong too often (`docs/findings.md`).

## Screens (MVP)

All built (2026-10-25), from the owner's design, each with its loading, empty, error and not-found states.

### Search (`/`)

- A search box and filters: country, visa (five levels; the default hides "Won't sponsor"), relocation offered,
  "no local language", role family, seniority, work mode, salary posted, posted within. Counts on every option.
- The search matches a whole word in the title, a word start in the company's name, or a technology the posting
  names, by any of its names ("golang", "k8s", "c++"). Not the posting's whole text: that was slow (about 1 s)
  and loose ("go" found "go-to-market", "C++" found nothing).
- Each result: title, company, place and work mode, the visa and relocation chips, the language, salary if
  posted, and how long ago the board posted it (the board's date, not when we first saw it).
- Filter state lives in the URL, so a search can be shared or bookmarked.
- Sorted strongest answer first by default; newest as an option.
- With countries chosen, "Can sponsor" counts only where it holds (a UK sponsor is "Unknown" in Germany).

### Job (`/jobs/:id`)

- The four answers on top (visa, moving, language, pay), "Apply on the company's site" (a new tab), and "Where the
  answers come from": the posting's sentence, each country's check (UK or IND register, the Blue Card salary
  minimum, "no register" elsewhere), relocation and languages, each with its source and date, and a next step
  when the answer is Unknown. What isn't read yet says so.
- "Last checked" time; a closed banner when the role is gone from the company's board; a real 404.
- "Report a wrong answer": the visitor picks the answer and says what the posting says; the site writes it as an
  email to the corrections address (`hi@azamatos.com`) in the visitor's own mail app. The site only reads the
  database, so it stores nothing.
- A board that posts for other companies says the employer, and the sponsor, may be someone else.

### Company (`/companies/:ats/:slug`)

- Open roles strongest first, what its postings say about visas, its register checks per country, the Blue Card
  count for its German roles, its board, and a correction or removal link.

### Country (`/countries/:code`)

- Germany, the Netherlands and the United Kingdom: the permit route with the official amounts, their sources and
  the date checked (`visa_rule`), what each answer means there, the register check, the strongest roles.
- Other countries: their roles, and "not researched yet" (owner, 2026-10-25: full pages for these three only).

### Method (`/method`)

- How it works, the five answers with live counts, the measured accuracy (dated), what it can't do, not legal
  advice, and how a company asks for a correction or removal.

### Status (`/status`)

- Each part of the pipeline (job boards, open roles, registers, reading the postings, finding boards), when it last
  ran and whether that's on time: job boards fresh under 7 hours, late to 13, stale after. Failed boards by what
  they answered. Every page shows a notice when the job boards are stale.

## Visa rules by country

Each rule needs a source URL and a checked date before the site shows it. Re-check every January (thresholds
change yearly). Researched 2026-10-17; "verify" marks a figure taken from a secondary source.

| Country            | Route for developers                        | Employer check                                                                                            | 2026 salary threshold (gross)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Source                                                                                                                                                 |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Germany**        | EU Blue Card                                | None: there's no sponsor register and any employer can hire on a Blue Card                                | €50,700/year general; **€45,934.20/year** for shortage occupations (including IT specialists) and graduates of the last 3 years. Consistent across [CMS law firm](https://cms.law/en/deu/legal-updates/gefragt-wie-nie-die-blaue-karte-eu-als-schluessel-im-recruiting-internationaler-fachkraefte), [rt partner](https://www.rtpartner.de/immigration/blaue-karte-eu-mindestgehalt-2026/) and others (checked 2026-10-23); confirm on make-it-in-germany.com (blocks automated reads) before showing. | [BAnz AT 18.12.2025 B3](https://www.bundesanzeiger.de/pub/publication/REViP4bN6jVdpGxPaiQ/content/REViP4bN6jVdpGxPaiQ/BAnz%20AT%2018.12.2025%20B3.pdf) |
| **Netherlands**    | Highly Skilled Migrant (or EU Blue Card)    | Employer **must** be an IND recognised sponsor                                                            | HSM: €5,942/month at 30+, €4,357 under 30, €3,122 reduced criterion; Blue Card €5,942 (reduced €4,754). Excluding the 8% holiday allowance (**verify**).                                                                                                                                                                                                                                                                                                                                               | [IND required amounts](https://ind.nl/en/required-amounts-income-requirements)                                                                         |
| **United Kingdom** | Skilled Worker                              | Employer must hold a sponsor licence (Home Office register)                                               | Not researched yet: going rate per occupation code; research before UK verdicts show salary checks                                                                                                                                                                                                                                                                                                                                                                                                     | [Register](https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers)                                                           |
| **Denmark**        | Fast-track scheme (and others)              | SIRI list of fast-track certified companies (~990)                                                        | Not researched yet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [SIRI certified companies](https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Certified-companies)                                                |
| **Ireland**        | Critical Skills / General Employment Permit | No licence system; DETE publishes permits issued per company (evidence of past sponsoring, not a licence) | Not researched yet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [DETE statistics 2026](https://enterprise.gov.ie/en/publications/employment-permit-statistics-2026.html)                                               |
| Other EU           | National skilled-worker permits             | No register checked                                                                                       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                      |

What the site says per country:

- **Germany:** "No sponsor licence needed for the Blue Card." Salary posted → above or below the threshold;
  not posted → "salary not posted: the Blue Card needs at least €X".
- **Netherlands:** an employer that isn't on the IND register gets a red warning, whatever the posting says.
- **UK:** not on the register → warning; on it → "Licensed sponsor", plus the posting's own statement.
- **Ireland:** "Has sponsored N permits this year" when DETE's data matches (later, not MVP).

## Data and content rules

- **Sources:** only companies' public job-board feeds and the governments' published registers. Never LinkedIn,
  never a site whose terms forbid automated access.
- **What we store and show:** title, company, location, dates, the extracted facts, quotes of at most a few
  sentences, and the link. The full posting text is stored privately for extraction and evaluation, never shown.
- **Attribution:** every job page links to the original posting, and the company's name is never altered.
- **Removal:** a company can ask to be removed or corrected; honour it within a week.
- **Personal data:** none in the MVP (no accounts). Alerts later will need email addresses, a privacy policy and
  deletion on request.
- **No ranking for money:** no paid placement or sponsored listings, which would undermine the verdicts.
- **Disclaimer on every verdict:** "Based on the posting text and public registers. Not legal advice; confirm
  with the employer."
