import type { VisaState } from "#shared/answers";
import type { Stats } from "#shared/stats";

// The numbers the Method page quotes, live: how many roles have each answer, and how much of the work is done.

export default defineEventHandler(async (): Promise<Stats> => {
  const sql = db();
  const [[counts], states, [known]] = await Promise.all([
    sql<Omit<Stats, "visa" | "boardsKnown">[]>`
      select count(*)::int as roles, count(distinct p.company_id)::int as companies,
        count(*) filter (where p.mentions)::int as mentions,
        count(*) filter (where a.relocation = 'helps')::int as helps,
        count(*) filter (where a.languages = '{}')::int as "englishOnly",
        count(*) filter (where a.languages is not null)::int as "languagesChecked",
        (select count(distinct company_id)::int from register_review) as reviewed
      from posting p join role_answer a on a.posting_id = p.id where p.closed_at is null`,
    sql<{ visa: VisaState; n: number }[]>`
      select a.visa, count(*)::int as n from posting p join role_answer a on a.posting_id = p.id
      where p.closed_at is null group by 1`,
    sql<{ n: number }[]>`select count(*)::int as n from company`,
  ]);
  const visa: Stats["visa"] = { sponsors: 0, may: 0, can: 0, unknown: 0, wont: 0 };
  for (const s of states) visa[s.visa] = s.n;
  return {
    roles: counts?.roles ?? 0,
    companies: counts?.companies ?? 0,
    boardsKnown: known?.n ?? 0,
    visa,
    mentions: counts?.mentions ?? 0,
    helps: counts?.helps ?? 0,
    englishOnly: counts?.englishOnly ?? 0,
    languagesChecked: counts?.languagesChecked ?? 0,
    reviewed: counts?.reviewed ?? 0,
  };
});
