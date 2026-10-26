# Register reviews

`registers.jsonl`: whether each of the biggest employers is on a sponsor register, decided by review, one line per
company and register. Load it with `node src/cli.ts reviews reviews/registers.jsonl`; every "listed" must name an
entry on the register at that moment, or nothing loads.

- `register`: `nl_ind` (IND recognised sponsors) or `uk_worker` (Home Office licensed sponsors, Skilled Worker).
- `verdict`: `listed` (with `entry_name`, the register's name for it, character for character), `not_listed`, or
  `unsure` (the employer couldn't be established, or the board posts for several companies or for clients).
- `evidence`: how the legal entity was found (its site, its postings, a company registry number matching the
  register's) and checked.
- `reviewed_by`: `agent` or `owner`. The owner spot-checks agent reviews; a line the owner confirmed or corrected
  says `owner`.

How to decide: the register comes first. When the match isn't clear, go to the company's own website (on most job
boards the logo links to it), then back to the register, and decide; "unsure" is for a board whose employer can't
be established, not for a hard case. When a group has several entities, the verdict follows the one that employs
most of the board's roles in that country.

The first round (2026-10-24): the 100 companies with the most roles in the Netherlands and the 100 with the most in
the UK, by agents with web research: 142 listed, 40 not listed, 18 unsure. The owner's spot-check (2026-10-26):
24 of 29 confirmed; BJAK's two notes were about its name (shown as the slug), not the verdict; the 3 the owner wasn't sure of were checked again on the company sites and
Companies House (Prima and Ballast Nedam stay listed; Talan's UK roles are mostly at Talan Consulting UK Limited,
which isn't on the register, so it's now not listed).

# Company names

`companies.jsonl`: the public name of each company whose board doesn't send one (Ashby, Lever and most Personio
boards), one line per board. Load it with `node src/cli.ts names reviews/companies.jsonl` (deploy.sh does, every
deploy). A name only fills a gap: a board that sends its own name keeps it, and a board that starts sending one
replaces the reviewed name. The file is the whole truth: a name changed here changes on the next load, and a line
taken out (or made low-confidence) takes its name off. Low-confidence names aren't loaded.

- `name`: the name the company uses for itself, in its own capitalisation ("N26", "loveholidays"), not a legal
  entity unless that's how it presents itself.
- `evidence`: the company site (the board's logo usually links to it), a posting sentence or the board page title
  that says so. A board title can carry the domain ("Featherless AI" for Featherless, featherless.ai).
- `confidence`: `high`, `medium` or `low`.
- `posts_for_others`: the board posts roles for other companies (a recruiter, a staffing agency, an investor's
  portfolio board), so the site says the employer, and the sponsor, may be someone else.
- `reviewed_by`: `agent` or `owner`.

The first round (2026-10-25): the 200 unnamed boards with the most open roles, by agents reading the postings and
each board's page once: 198 high, 2 medium; 6 post for others. The owner's spot-check (2026-10-26): 7 of 8 right,
one corrected (Featherless). Open roles shown under a slug went from 4,103 to
1,119. Two "Kraken" boards: the energy software company is named "Kraken Technologies" to tell it from the
exchange.
