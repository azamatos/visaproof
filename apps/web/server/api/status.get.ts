import { type Run, statusOf, type StatusRaw } from "#shared/status";

// Is the data fresh: what the pipeline's runs recorded, read as on time, late or stale (shared/status.ts). Public
// facts only: counts and times, no board names or error texts.

type RunRow = { kind: string; finished_at: Date; stats: Record<string, number> | null };

// What a board that failed answered, in plain words. 404s and 410s aren't failures: the board is gone.
const REASON = `case
  when error ~ 'HTTP 40[13]' then 'blocks us (401 or 403)'
  when error ~ 'HTTP 429' then 'asks us to slow down (429)'
  when error ~ 'HTTP 5[0-9][0-9]' then 'down (5xx)'
  when error ~* 'not JSON|not XML|<!DOCTYPE|<html' then 'not a job board'
  when error ~* 'timeout|timed out|ECONN|fetch failed|socket' then 'didn''t answer in time'
  else 'other' end`;

export default defineEventHandler(async () => {
  const sql = db();
  const [runs, failures, [open], [registers], [reading], [known]] = await Promise.all([
    sql<RunRow[]>`
      select distinct on (kind) kind, finished_at, stats from run
      where kind in ('ingest', 'registers', 'extract', 'discover') and finished_at is not null
      order by kind, finished_at desc`,
    sql<{ reason: string; n: number }[]>`
      select ${sql.unsafe(REASON)} as reason, count(*)::int as n from source_result
      where run_id = (select id from run where kind = 'ingest' and finished_at is not null order by id desc limit 1)
        and not ok and error !~ 'HTTP 4(04|10)'
      group by 1 order by 2 desc`,
    sql<StatusRaw["open"][]>`
      select count(*)::int as roles, count(distinct company_id)::int as companies,
        (select count(distinct c)::int from posting, unnest(countries) c where closed_at is null) as countries,
        count(*) filter (where first_seen_at > now() - interval '1 day')::int as new24h
      from posting where closed_at is null`,
    sql<{ nl: number; uk: number; loaded_at: Date | null; reviewed: number; listed: number }[]>`
      select count(*) filter (where register = 'nl_ind')::int as nl,
        count(*) filter (where register = 'uk_worker')::int as uk, max(fetched_at) as loaded_at,
        (select count(distinct company_id)::int from register_review) as reviewed,
        (select count(distinct company_id)::int from register_review where verdict = 'listed') as listed
      from register_entry`,
    sql<StatusRaw["reading"][]>`
      select count(*) filter (where p.mentions and a.read_at is null)::int as waiting,
        count(*) filter (where a.languages is not null)::int as "languagesChecked"
      from posting p join role_answer a on a.posting_id = p.id where p.closed_at is null`,
    sql<{ n: number }[]>`select count(*)::int as n from company`,
  ]);

  const run = (kind: string): Run => {
    const r = runs.find((x) => x.kind === kind);
    return r ? { finishedAt: r.finished_at.toISOString(), stats: r.stats ?? {} } : null;
  };
  return statusOf({
    now: new Date().toISOString(),
    runs: {
      ingest: run("ingest"),
      registers: run("registers"),
      extract: run("extract"),
      discover: run("discover"),
    },
    failures,
    open: open ?? { roles: 0, companies: 0, countries: 0, new24h: 0 },
    registers: {
      nl: registers?.nl ?? 0,
      uk: registers?.uk ?? 0,
      loadedAt: registers?.loaded_at?.toISOString() ?? null,
      reviewed: registers?.reviewed ?? 0,
      listed: registers?.listed ?? 0,
    },
    reading: reading ?? { waiting: 0, languagesChecked: 0 },
    boardsKnown: known?.n ?? 0,
  });
});
