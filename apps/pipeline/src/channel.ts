import { sql } from "./db.ts";

// The public Telegram channel's daily post: the roles posted in the last week whose posting says the employer
// sponsors a visa (or may), not posted before, newest first; then how many more new roles are at employers that
// can sponsor (a register, a Blue Card salary). Each role links to its page on the site, which quotes the evidence
// and links to the original: no posting text here (AGENTS.md, rule 3). The roles come from the site's own search,
// so the channel reads exactly as the site does. deploy/channel.sh sends the post and then marks it sent.

const SITE = process.env.SITE_URL ?? "https://visaproof.azamatos.com";
// The site's server, on the compose network
const API = process.env.SITE_API ?? "http://web:3000";
// Roles in one post, and from one company; the rest wait for the next post while they're less than a week old.
const MAX = 10;
const PER_COMPANY = 2;

// A role as the site's search returns it (apps/web/shared/answers.ts, RoleCard).
export type Card = {
  id: number;
  title: string;
  company: string;
  place: string;
  workMode: string;
  visa: string;
  relocation: string;
  languages: string[] | null;
  salary: string | null;
};
type Search = { total: number; pages: number; roles: Card[] };

const VISA: Record<string, string> = { sponsors: "Sponsors visa", may: "May sponsor" };
const RELOCATION: Record<string, string> = { helps: "Helps you move", may: "May help you move" };
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const n = (x: number) => x.toLocaleString("en-US");
const day = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function languages(l: Card["languages"]): string | null {
  if (!l) return null;
  return l.length ? `${l.map(capital).join(", ")} required` : "English only";
}

// The post in Telegram's HTML. `more`: roles beyond this post that sponsor or may; `can`: new roles at employers
// that can sponsor.
export function channelMessage(
  roles: Card[],
  more: number,
  can: number,
  now = new Date(),
  site = SITE,
): string {
  const items = roles.map((r) =>
    [
      `<a href="${site}/jobs/${String(r.id)}"><b>${esc(r.title)}</b></a>`,
      esc([r.company, r.place, r.workMode].filter(Boolean).join(" · ")),
      esc(
        [VISA[r.visa], RELOCATION[r.relocation], languages(r.languages), r.salary]
          .filter((x): x is string => !!x)
          .join(" · "),
      ),
    ].join("\n"),
  );
  const tail = [
    more
      ? `<a href="${site}/?visa=may&amp;within=7&amp;sort=newest">${n(more)} more that sponsor or may, on the site</a>`
      : "",
    can
      ? `Also new in the last day: ${n(can)} ${can === 1 ? "role" : "roles"} at employers that can sponsor (on a sponsor register, or paying enough for a Blue Card). <a href="${site}/?visa=can&amp;within=1&amp;sort=newest">See them</a>`
      : "",
  ].filter(Boolean);
  return [
    `<b>New roles that sponsor a visa</b>\n${day.format(now)} · from companies' own job boards`,
    ...items,
    ...tail,
  ].join("\n\n");
}

// "Sponsors" before "may", newest first within each, at most PER_COMPANY from one company.
export function pick(fresh: Card[]): Card[] {
  const order = (r: Card) => (r.visa === "sponsors" ? 0 : 1);
  const from = new Map<string, number>();
  return [...fresh]
    .sort((a, b) => order(a) - order(b))
    .filter((r) => {
      const k = (from.get(r.company) ?? 0) + 1;
      from.set(r.company, k);
      return k <= PER_COMPANY;
    })
    .slice(0, MAX);
}

async function search(query: string, page = 1): Promise<Search> {
  const res = await fetch(`${API}/api/roles?${query}&page=${String(page)}`);
  if (!res.ok) throw new Error(`the site answered HTTP ${String(res.status)} for /api/roles?${query}`);
  return (await res.json()) as Search;
}

// Writes the next post and prints its id, then the post; prints nothing when there's nothing new.
export async function channel() {
  await sql`delete from channel_post where sent_at is null`;
  const posted = new Set(
    (
      await sql<{ id: number }[]>`
        select distinct i.posting_id::int as id from channel_item i join channel_post p on p.id = i.post_id
        where p.sent_at is not null`
    ).map((r) => r.id),
  );
  const fresh: Card[] = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const s = await search("visa=may&within=7&sort=newest", page);
    pages = s.pages;
    fresh.push(...s.roles.filter((r) => !posted.has(r.id)));
  }
  if (!fresh.length) return;
  const roles = pick(fresh);
  const [can, may] = await Promise.all([search("visa=can&within=1"), search("visa=may&within=1")]);
  const text = channelMessage(roles, fresh.length - roles.length, can.total - may.total);
  const [post] = await sql<{ id: number }[]>`insert into channel_post (text) values (${text}) returning id`;
  if (!post) throw new Error("channel_post: no id");
  await sql`insert into channel_item ${sql(roles.map((r) => ({ post_id: post.id, posting_id: r.id })))}`;
  console.log(`${String(post.id)}\n${text}`);
}

export async function channelSent(id: number) {
  const done = await sql`update channel_post set sent_at = now() where id = ${id} and sent_at is null`;
  if (!done.count) throw new Error(`no unsent channel post ${String(id)}`);
}
