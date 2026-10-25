import type { RelocationState, VisaState } from "#shared/answers";
import { BOARD_NAMES, boardUrl, companyPath } from "#shared/boards";
import type { JobDetail, Pay, RegisterReview } from "#shared/evidence";
import { companyName, place, salary, WORK_MODE } from "#shared/format";

// One role with its answers and what they rest on, open or closed. 404 when there's no such role.

type Row = {
  id: number;
  title: string;
  url: string;
  location_raw: string;
  countries: string[];
  work_mode: string;
  remote_scope: string;
  pay: Pay | null;
  posted: Date;
  first_seen_at: Date;
  last_seen_at: Date;
  closed_at: Date | null;
  technologies: { key: string; label: string }[];
  name: string | null;
  slug: string;
  ats: string;
  eu: boolean;
  others: number;
  visa: VisaState;
  can_in: string[];
  visa_quote: string | null;
  visa_unread: boolean;
  read_at: Date | null;
  relocation: RelocationState;
  relocation_quote: string | null;
  languages: string[] | null;
  language_quote: string | null;
  written_in: string | null;
  languages_read_at: Date | null;
  uk_verdict: NonNullable<RegisterReview>["verdict"] | null;
  uk_entry: string | null;
  nl_verdict: NonNullable<RegisterReview>["verdict"] | null;
  nl_entry: string | null;
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const review = (verdict: Row["uk_verdict"], entry: string | null): RegisterReview =>
  verdict ? { verdict, entry } : null;

export default defineEventHandler(async (event): Promise<JobDetail> => {
  const id = Number(getRouterParam(event, "id"));
  if (!Number.isSafeInteger(id) || id <= 0)
    throw createError({ statusCode: 404, statusMessage: "No such role" });
  const sql = db();
  const [[r], [loaded], [blue]] = await Promise.all([
    sql<Row[]>`
      select p.id::int as id, p.title, p.url, p.location_raw, p.countries, p.work_mode, p.remote_scope, p.pay,
        least(p.posted_at, p.first_seen_at) as posted, p.first_seen_at, p.last_seen_at, p.closed_at,
        coalesce((select json_agg(json_build_object('key', t.key, 'label', t.label) order by t.label)
          from technology t where t.key = any(p.technologies)), '[]') as technologies,
        c.name, c.slug, c.ats, c.eu,
        (select count(*)::int from posting o where o.company_id = p.company_id and o.closed_at is null
          and o.id <> p.id) as others,
        a.visa, a.can_in, a.visa_quote, mentions_visa(p.description) and a.read_at is null as visa_unread, a.read_at,
        a.relocation, a.relocation_quote, a.languages, a.language_quote, a.written_in, a.languages_read_at,
        a.uk_verdict, a.uk_entry, a.nl_verdict, a.nl_entry
      from posting p join company c on c.id = p.company_id join role_answer a on a.posting_id = p.id
      where p.id = ${id}`,
    sql<{ gb: Date | null; nl: Date | null }[]>`
      select max(fetched_at) filter (where register = 'uk_worker') as gb,
        max(fetched_at) filter (where register = 'nl_ind') as nl
      from register_entry`,
    sql<{ amount: string; currency: string; source_url: string; checked_on: Date }[]>`
      select amount, currency, source_url, checked_on from visa_rule
      where country = 'DE' and rule = 'blue_card_reduced' and applies_from <= current_date
      order by applies_from desc limit 1`,
  ]);
  if (!r) throw createError({ statusCode: 404, statusMessage: "No such role" });

  const name = companyName(r.name, r.slug);
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    company: {
      name,
      path: companyPath(r.ats, r.slug),
      board: boardUrl(r.ats, r.slug, r.eu),
      boardName: BOARD_NAMES[r.ats] ?? r.ats,
      others: r.others,
    },
    place: place(r.location_raw, r.countries, r.work_mode, r.remote_scope),
    workMode: WORK_MODE[r.work_mode] ?? "",
    countries: r.countries,
    pay: r.pay,
    salary: salary(r.pay),
    posted: r.posted.toISOString(),
    firstSeen: r.first_seen_at.toISOString(),
    lastSeen: r.last_seen_at.toISOString(),
    closedAt: iso(r.closed_at),
    technologies: r.technologies,
    visa: r.visa,
    canIn: r.can_in,
    visaQuote: r.visa_quote,
    visaUnread: r.visa_unread,
    readAt: iso(r.read_at),
    relocation: r.relocation,
    relocationQuote: r.relocation_quote,
    languages: r.languages,
    languageQuote: r.language_quote,
    writtenIn: r.written_in,
    languagesReadAt: iso(r.languages_read_at),
    registers: { GB: review(r.uk_verdict, r.uk_entry), NL: review(r.nl_verdict, r.nl_entry) },
    registerLoaded: { GB: iso(loaded?.gb ?? null), NL: iso(loaded?.nl ?? null) },
    blueCard: blue
      ? {
          amount: Number(blue.amount),
          currency: blue.currency,
          source: blue.source_url.includes("bundesanzeiger")
            ? "Federal Gazette (Bundesanzeiger)"
            : new URL(blue.source_url).host,
          checkedOn: blue.checked_on.toISOString(),
        }
      : null,
  };
});
