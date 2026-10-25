import type { CountryDetail } from "#shared/country";
import { COUNTRIES, countryName } from "#shared/countries";

// One country: its open roles and their answers there, the official amounts (visa_rule), the register check for
// the countries with one, and the strongest roles. 404 for a country out of scope.

const REGISTER: Record<string, string> = { GB: "uk_worker", NL: "nl_ind" };

export default defineEventHandler(async (event): Promise<CountryDetail> => {
  const code = (getRouterParam(event, "code") ?? "").toUpperCase();
  if (!(code in COUNTRIES)) throw createError({ statusCode: 404, statusMessage: "No such country" });
  const sql = db();
  // "Can sponsor" holds per country: here only if it holds in this country.
  const visa = sql`case when a.visa = 'can' and not ${code} = any(a.can_in) then 'unknown' else a.visa end`;
  const from = sql`posting p join company c on c.id = p.company_id join role_answer a on a.posting_id = p.id`;
  const here = sql`p.closed_at is null and ${code} = any(p.countries)`;
  const register = REGISTER[code];
  const [[counts], rules, [reg], rows] = await Promise.all([
    sql<
      {
        open: number;
        wont: number;
        companies: number;
        salary: number;
        can: number;
        checked: number;
        required: number;
      }[]
    >`
      select count(*)::int as open, count(*) filter (where a.visa = 'wont')::int as wont,
        count(distinct p.company_id)::int as companies, count(*) filter (where p.pay is not null)::int as salary,
        count(*) filter (where ${code} = any(a.can_in) and a.visa = 'can')::int as can,
        count(*) filter (where a.languages is not null)::int as checked,
        count(*) filter (where a.languages <> '{}')::int as required
      from ${from} where ${here}`,
    sql<{ rule: string; amount: string; currency: string; period: string; checked_on: Date }[]>`
      select distinct on (rule) rule, amount, currency, period, checked_on from visa_rule
      where country = ${code} and applies_from <= current_date order by rule, applies_from desc`,
    register
      ? sql<{ companies: number; reviewed: number; listed: number; loaded_at: Date | null }[]>`
          select count(distinct p.company_id)::int as companies,
            count(distinct r.company_id)::int as reviewed,
            count(distinct r.company_id) filter (where r.verdict = 'listed' and exists (
              select 1 from register_entry x where x.register = r.register and x.name = r.entry_name))::int as listed,
            (select max(fetched_at) from register_entry where register = ${register}) as loaded_at
          from posting p left join register_review r on r.company_id = p.company_id and r.register = ${register}
          where ${here}`
      : Promise.resolve([]),
    sql<CardRow[]>`
      select ${cardColumns(sql, visa)} from ${from} where ${here} and a.visa <> 'wont'
      order by case ${visa} when 'sponsors' then 1 when 'may' then 2 when 'can' then 3 else 4 end,
        ${posted(sql)} desc, p.id desc
      limit 6`,
  ]);
  return {
    code,
    name: countryName(code),
    open: counts?.open ?? 0,
    shown: (counts?.open ?? 0) - (counts?.wont ?? 0),
    wont: counts?.wont ?? 0,
    companies: counts?.companies ?? 0,
    salaryPosted: counts?.salary ?? 0,
    can: counts?.can ?? 0,
    languages: { checked: counts?.checked ?? 0, required: counts?.required ?? 0 },
    rules: rules.map((r) => ({
      rule: r.rule,
      amount: Number(r.amount),
      currency: r.currency,
      period: r.period,
      checkedOn: r.checked_on.toISOString(),
    })),
    register: reg
      ? {
          companies: reg.companies,
          reviewed: reg.reviewed,
          listed: reg.listed,
          loadedAt: reg.loaded_at?.toISOString() ?? null,
        }
      : null,
    roles: rows.map(toCard),
  };
});
