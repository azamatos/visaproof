import type { PendingQuery, Row, Sql } from "postgres";
import type { RelocationState, RoleCard, VisaState } from "#shared/answers";
import { age, companyName, place, salary, WORK_MODE } from "#shared/format";

// What a job card shows, as columns of `posting p join company c join role_answer a`, and the card made from them.
// Search, company and country pages list roles the same way.

export type CardRow = {
  id: number;
  title: string;
  name: string | null;
  slug: string;
  location_raw: string;
  countries: string[];
  work_mode: string;
  remote_scope: string;
  visa: VisaState;
  relocation: RelocationState;
  languages: string[] | null;
  pay: { min: number; max: number; currency: string; period: string } | null;
  posted: Date;
};

// "Posted" is the board's own date: the pipeline first saw every role in its first week.
export const posted = (sql: Sql) => sql`least(p.posted_at, p.first_seen_at)`;

export const cardColumns = (sql: Sql, visa: PendingQuery<Row[]> = sql`a.visa`) =>
  sql`p.id::int as id, p.title, c.name, c.slug, p.location_raw, p.countries, p.work_mode, p.remote_scope,
    ${visa} as visa, a.relocation, a.languages, p.pay, ${posted(sql)} as posted`;

export const toCard = (r: CardRow): RoleCard => ({
  id: r.id,
  title: r.title,
  company: companyName(r.name, r.slug),
  companySlug: r.slug,
  place: place(r.location_raw, r.countries, r.work_mode, r.remote_scope),
  workMode: WORK_MODE[r.work_mode] ?? "",
  visa: r.visa,
  relocation: r.relocation,
  languages: r.languages,
  salary: salary(r.pay),
  posted: age(r.posted),
});
