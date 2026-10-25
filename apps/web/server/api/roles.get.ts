import type { PendingQuery, Row } from "postgres";
import {
  FAMILIES,
  MODES,
  SENIORITY,
  VISA_LEVELS,
  VISA_STATES,
  type VisaLevel,
  type VisaState,
} from "#shared/answers";
import { COUNTRIES } from "#shared/countries";

// Search: open roles with their answers, filtered and sorted, 20 a page, with a count on every filter option. An
// option's count applies every other filter, so it says what choosing it would leave.

const PAGE = 20;
const keys = (xs: readonly { key: string }[]) => xs.map((x) => x.key);

type Filters = {
  q: string;
  visa: (typeof VISA_LEVELS)[number];
  countries: string[];
  relocation: boolean;
  noLanguage: boolean;
  salary: boolean;
  families: string[];
  seniority: string[];
  modes: string[];
  within: number;
};
type Facet =
  | "visa"
  | "countries"
  | "relocation"
  | "noLanguage"
  | "salary"
  | "families"
  | "seniority"
  | "modes"
  | "within";

// Query values arrive as strings, arrays (a repeated key) or nothing; only a single string counts.
const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown, allowed: string[]) =>
  str(v)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => allowed.includes(s));

function parse(query: Record<string, unknown>): Filters {
  const level = VISA_LEVELS.find((l) => l.key === query.visa) ?? VISA_LEVELS[3];
  return {
    q: str(query.q).trim().slice(0, 80),
    visa: level,
    countries: list(str(query.country).toUpperCase(), Object.keys(COUNTRIES)),
    relocation: query.relocation === "1",
    noLanguage: query.nolang === "1",
    salary: query.salary === "1",
    families: list(query.family, keys(FAMILIES)),
    seniority: list(query.seniority, keys(SENIORITY)),
    modes: list(query.mode, keys(MODES)),
    within: [1, 7, 30].includes(Number(query.within)) ? Number(query.within) : 0,
  };
}

export default defineEventHandler(async (event) => {
  const f = parse(getQuery(event));
  const page = Math.max(1, Math.min(50, Number(getQuery(event).page) || 1));
  const sort = getQuery(event).sort === "newest" ? "newest" : "strongest";
  const sql = db();
  const postedAt = posted(sql);
  // "Can sponsor" holds per country (a UK sponsor can't sponsor in Germany): with countries chosen, a role that can
  // sponsor only in others is "unknown" here. The country counts check each country on its own.
  const visaFor = (countries: PendingQuery<Row[]> | null) =>
    countries
      ? sql`case when a.visa = 'can' and not (a.can_in && ${countries}) then 'unknown' else a.visa end`
      : sql`a.visa`;
  const visa = visaFor(f.countries.length ? sql`${f.countries}::text[]` : null);
  const rank = sql`case ${visa} when 'sponsors' then 1 when 'may' then 2 when 'can' then 3 when 'unknown' then 4 else 5 end`;

  // Every filter as a condition; a facet's own condition is left out when counting its options.
  const where = (skip?: Facet, visaHere = visa) => {
    const c: PendingQuery<Row[]>[] = [sql`p.closed_at is null`];
    // A word in the title, the start of a word in the company's name, or a technology the posting names, by any
    // of its names ("golang", "k8s", "c++"). The posting's own text isn't searched: too slow, and too loose.
    if (f.q)
      c.push(sql`(p.title ~* ${wordPattern(f.q)} or coalesce(c.name, c.slug) ~* ${startPattern(f.q)}
        or p.technologies && array(select key from technology where ${f.q.toLowerCase()} = any(search)))`);
    if (skip !== "visa") c.push(sql`${visaHere} in ${sql(f.visa.states)}`);
    if (skip !== "countries" && f.countries.length) c.push(sql`p.countries && ${f.countries}::text[]`);
    if (skip !== "relocation" && f.relocation) c.push(sql`a.relocation = 'helps'`);
    if (skip !== "noLanguage" && f.noLanguage) c.push(sql`a.languages = '{}'`);
    if (skip !== "salary" && f.salary) c.push(sql`p.pay is not null`);
    if (skip !== "families" && f.families.length) c.push(sql`p.family in ${sql(f.families)}`);
    if (skip !== "seniority" && f.seniority.length) c.push(sql`p.seniority in ${sql(f.seniority)}`);
    if (skip !== "modes" && f.modes.length) c.push(sql`p.work_mode in ${sql(f.modes)}`);
    if (skip !== "within" && f.within) c.push(sql`${postedAt} > now() - make_interval(days => ${f.within})`);
    return c.reduce((all, one) => sql`${all} and ${one}`);
  };
  const from = sql`posting p join company c on c.id = p.company_id join role_answer a on a.posting_id = p.id`;
  const order =
    sort === "newest" ? sql`${postedAt} desc, p.id desc` : sql`${rank}, ${postedAt} desc, p.id desc`;

  const group = (column: PendingQuery<Row[]>, skip: Facet) =>
    sql<{ key: string; n: number }[]>`
      select ${column} as key, count(*)::int as n from ${from} where ${where(skip)} group by 1`;
  const [rows, [total], states, countries, [switches], families, seniority, modes, [within]] =
    await Promise.all([
      sql<CardRow[]>`
      select ${cardColumns(sql, visa)}
      from ${from} where ${where()} order by ${order} limit ${PAGE} offset ${(page - 1) * PAGE}`,
      sql<{ n: number }[]>`select count(*)::int as n from ${from} where ${where()}`,
      sql<{ visa: VisaState; n: number }[]>`
      select ${visa} as visa, count(*)::int as n from ${from} where ${where("visa")} group by 1`,
      sql<{ code: string; n: number }[]>`
      select x.code, count(*)::int as n from ${from}, unnest(p.countries) as x(code)
      where ${where("countries", visaFor(sql`array[x.code]`))} and x.code in ${sql(Object.keys(COUNTRIES))}
      group by 1 order by 2 desc`,
      sql<{ relocation: number; no_language: number; salary: number }[]>`
      select
        (select count(*)::int from ${from} where ${where("relocation")} and a.relocation = 'helps') as relocation,
        (select count(*)::int from ${from} where ${where("noLanguage")} and a.languages = '{}') as no_language,
        (select count(*)::int from ${from} where ${where("salary")} and p.pay is not null) as salary`,
      group(sql`p.family`, "families"),
      group(sql`p.seniority`, "seniority"),
      group(sql`p.work_mode`, "modes"),
      sql<{ d1: number; d7: number; d30: number; any: number }[]>`
      select count(*) filter (where ${postedAt} > now() - interval '1 day')::int as d1,
        count(*) filter (where ${postedAt} > now() - interval '7 days')::int as d7,
        count(*) filter (where ${postedAt} > now() - interval '30 days')::int as d30, count(*)::int as any
      from ${from} where ${where("within")}`,
    ]);
  const keyed = (xs: { key: string; n: number }[]) =>
    Object.fromEntries(xs.map((x) => [x.key, x.n])) as Record<string, number>;

  const byState = Object.fromEntries(
    VISA_STATES.map((s) => [s, states.find((v) => v.visa === s)?.n ?? 0]),
  ) as Record<VisaState, number>;
  const roles = rows.map(toCard);
  return {
    total: total?.n ?? 0,
    page,
    pages: Math.ceil((total?.n ?? 0) / PAGE),
    roles,
    counts: {
      visa: byState,
      levels: Object.fromEntries(
        VISA_LEVELS.map((l) => [
          l.key,
          (l.states as readonly VisaState[]).reduce((s, st) => s + byState[st], 0),
        ]),
      ) as Record<VisaLevel, number>,
      countries,
      relocation: switches?.relocation ?? 0,
      noLanguage: switches?.no_language ?? 0,
      salary: switches?.salary ?? 0,
      families: keyed(families),
      seniority: keyed(seniority),
      modes: keyed(modes),
      within: { 0: within?.any ?? 0, 1: within?.d1 ?? 0, 7: within?.d7 ?? 0, 30: within?.d30 ?? 0 },
    },
  };
});
