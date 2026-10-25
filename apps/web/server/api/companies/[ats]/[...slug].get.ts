import type { VisaState } from "#shared/answers";
import { BOARD_NAMES, boardUrl } from "#shared/boards";
import type { CompanyDetail } from "#shared/company";
import type { RegisterReview } from "#shared/evidence";
import { companyName } from "#shared/format";

// One company's board: its open roles strongest first, what its postings say about visas, and its register checks
// for the countries it hires in. 404 when there's no such board.

const LIST = 50;

export default defineEventHandler(async (event): Promise<CompanyDetail> => {
  const ats = getRouterParam(event, "ats") ?? "";
  const slug = decodeURIComponent(getRouterParam(event, "slug") ?? "");
  const sql = db();
  const [c] = await sql<
    {
      id: number;
      name: string | null;
      slug: string;
      eu: boolean;
      posts_for_others: boolean;
      ok_at: Date | null;
    }[]
  >`select id, name, slug, eu, posts_for_others, ok_at from company where ats = ${ats} and slug = ${slug}
    order by eu limit 1`;
  if (!c) throw createError({ statusCode: 404, statusMessage: "No such company" });

  const from = sql`posting p join company c on c.id = p.company_id join role_answer a on a.posting_id = p.id`;
  const open = sql`p.company_id = ${c.id} and p.closed_at is null`;
  const [[counts], countries, [quote], reviews, [loaded], [blue], rows] = await Promise.all([
    sql<
      {
        open: number;
        sponsors: number;
        may: number;
        wont: number;
        unread: number;
        de: number;
        clears: number;
      }[]
    >`
      select count(*)::int as open, count(*) filter (where a.visa = 'sponsors')::int as sponsors,
        count(*) filter (where a.visa = 'may')::int as may, count(*) filter (where a.visa = 'wont')::int as wont,
        count(*) filter (where p.mentions and a.read_at is null)::int as unread,
        count(*) filter (where 'DE' = any(p.countries))::int as de,
        count(*) filter (where a.can_de)::int as clears
      from ${from} where ${open}`,
    sql<{ code: string; n: number }[]>`
      select x.code, count(*)::int as n from ${from}, unnest(p.countries) as x(code) where ${open}
      group by 1 order by 2 desc`,
    // One sentence to show for the company: a promise if any posting makes one, else a hedge, else a refusal.
    sql<{ quote: string; visa: VisaState }[]>`
      select a.visa_quote as quote, a.visa from ${from} where ${open} and a.visa_quote is not null
      order by a.visa_rank, a.read_at desc limit 1`,
    sql<
      {
        register: string;
        verdict: NonNullable<RegisterReview>["verdict"];
        entry_name: string | null;
        listed_now: boolean;
      }[]
    >`
      select r.register, r.verdict, r.entry_name,
        exists (select 1 from register_entry x where x.register = r.register and x.name = r.entry_name) as listed_now
      from register_review r where r.company_id = ${c.id}`,
    sql<{ gb: Date | null; nl: Date | null }[]>`
      select max(fetched_at) filter (where register = 'uk_worker') as gb,
        max(fetched_at) filter (where register = 'nl_ind') as nl from register_entry`,
    sql<{ amount: string; currency: string }[]>`
      select amount, currency from visa_rule where country = 'DE' and rule = 'blue_card_reduced'
        and applies_from <= current_date order by applies_from desc limit 1`,
    sql<CardRow[]>`
      select ${cardColumns(sql)} from ${from} where ${open}
      order by a.visa_rank, ${posted(sql)} desc, p.id desc limit ${LIST}`,
  ]);
  const review = (register: string) => {
    const r = reviews.find((x) => x.register === register);
    return {
      review: r ? { verdict: r.verdict, entry: r.entry_name } : null,
      onRegister: r?.verdict === "listed" && r.listed_now,
    };
  };
  return {
    name: companyName(c.name, c.slug),
    board: boardUrl(ats, c.slug, c.eu),
    boardName: BOARD_NAMES[ats] ?? ats,
    postsForOthers: c.posts_for_others,
    lastRead: c.ok_at?.toISOString() ?? null,
    open: counts?.open ?? 0,
    countries,
    said: {
      sponsors: counts?.sponsors ?? 0,
      may: counts?.may ?? 0,
      wont: counts?.wont ?? 0,
      quote: quote?.quote ?? null,
      quoteState: quote?.visa ?? null,
    },
    unread: counts?.unread ?? 0,
    registers: { GB: review("uk_worker"), NL: review("nl_ind") },
    registerLoaded: { GB: loaded?.gb?.toISOString() ?? null, NL: loaded?.nl?.toISOString() ?? null },
    blueCard: blue
      ? {
          amount: Number(blue.amount),
          currency: blue.currency,
          inGermany: counts?.de ?? 0,
          clears: counts?.clears ?? 0,
        }
      : null,
    roles: rows.map(toCard),
  };
});
