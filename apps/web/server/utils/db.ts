import postgres from "postgres";

// One pool per server process. The site only reads; the pipeline writes.
let pool: postgres.Sql | undefined;

export function db() {
  pool ??= postgres(useRuntimeConfig().databaseUrl, { max: 10, idle_timeout: 30, onnotice: () => {} });
  return pool;
}

// A pipeline run that worked: it didn't fail outright, read at least one board, found at least one board.
export const workedRun = () =>
  db()`finished_at is not null and not (stats ? 'error') and coalesce((stats->>'ok')::int, 1) > 0
    and not (kind = 'discover' and coalesce((stats->>'slugs')::int, 0) = 0)`;
