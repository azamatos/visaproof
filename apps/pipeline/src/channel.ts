import { sql } from "./db.ts";
import { count, esc, n } from "./text.ts";

// The public Telegram channel's daily post: the roles posted in the last week whose posting says the employer
// sponsors a visa (or may), not in an earlier post, newest first; then how many new roles are at employers that
// can sponsor (a register, a Blue Card salary). Each role links to its page on the site, which quotes the evidence
// and links to the original: no posting text here (AGENTS.md, rule 3). The roles come from the site's own search,
// so places, pay and answers read as they do on the site (techContext.md, decisions). deploy/channel.sh sends the
// post, then marks it sent, or drops it when Telegram refuses it.

const SITE = process.env.SITE_URL ?? "https://visaproof.azamatos.com";
// The site's server, on the compose network (SITE_API=http://localhost:4003 runs against a local site)
const API = process.env.SITE_API ?? "http://web:3000";
// Roles in one post, and from one company; the rest wait for the next post while they're less than a week old.
const MAX = 10;
const PER_COMPANY = 2;
// Telegram's limit is 4,096 characters of text; the markup doesn't count, so this leaves room.
const LIMIT = 4000;

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
type Search = { total: number; pages: number; roles: Card[]; counts: { visa: Record<string, number> } };

// The site's labels (apps/web/shared/answers.ts): "Says nothing" about relocation is left out, as on its cards.
const VISA: Record<string, string> = { sponsors: "Sponsors visa", may: "May sponsor" };
const RELOCATION: Record<string, string> = {
  helps: "Helps you move",
  may: "May help you move",
  no: "No relocation",
};
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

export type Tail = {
  more: number; // roles from the week that sponsor or may, not in this post or an earlier one
  week: number; // all roles from the week that sponsor or may, as the linked search lists them
  can: number; // roles from the last day at employers that can sponsor
};

// The post in Telegram's HTML.
export function channelMessage(roles: Card[], tail: Tail, now = new Date(), site = SITE): string {
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
  const more = tail.more
    ? `<a href="${site}/?visa=may&amp;within=7&amp;sort=newest">All ${n(tail.week)} roles from the last week that sponsor or may</a>`
    : "";
  const can = tail.can
    ? `Also new in the last day: ${count(tail.can, "role")} at employers that can sponsor (on a sponsor register, or paying enough for a Blue Card). <a href="${site}/?visa=can&amp;within=1&amp;sort=newest">See every new role</a>`
    : "";
  return [
    `<b>New roles that sponsor a visa</b>\n${day.format(now)} · from companies' own job boards`,
    ...items,
    ...[more, can].filter(Boolean),
  ].join("\n\n");
}

// "Sponsors" before "may", newest first within each, at most PER_COMPANY from one company, each role once.
export function pick(fresh: Card[]): Card[] {
  const order = (r: Card) => (r.visa === "sponsors" ? 0 : 1);
  const seen = new Set<number>();
  const from = new Map<string, number>();
  return [...fresh]
    .sort((a, b) => order(a) - order(b))
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      const k = (from.get(r.company) ?? 0) + 1;
      from.set(r.company, k);
      return k <= PER_COMPANY;
    })
    .slice(0, MAX);
}

// The longest post within Telegram's limit: roles come off the end until it fits. `left`: roles not picked at all.
export function fit(
  roles: Card[],
  tail: Omit<Tail, "more"> & { left: number },
  now = new Date(),
  site = SITE,
) {
  for (let k = roles.length; k > 0; k--) {
    const text = channelMessage(
      roles.slice(0, k),
      { ...tail, more: tail.left + roles.length - k },
      now,
      site,
    );
    if (text.length <= LIMIT) return { roles: roles.slice(0, k), text };
  }
  throw new Error("not even one role fits in a Telegram message");
}

async function search(query: string, page = 1): Promise<Search> {
  const res = await fetch(`${API}/api/roles?${query}&page=${String(page)}`);
  if (!res.ok) throw new Error(`the site answered HTTP ${String(res.status)} for /api/roles?${query}`);
  return (await res.json()) as Search;
}

// Writes the next post and prints its id, then the post; prints nothing when there's nothing new. Its roles count as
// posted from now on, so a post Telegram may have shown is never sent twice. --dry only prints it.
export async function channel(dry = false) {
  const posted = new Set(
    (await sql<{ id: number }[]>`select distinct posting_id::int as id from channel_item`).map((r) => r.id),
  );
  // The search pages 20 at a time, up to page 50: far more than a week of roles that sponsor.
  const query = "visa=may&within=7&sort=newest";
  const first = await search(query);
  const fresh = new Map<number, Card>();
  for (let page = 1; page <= Math.min(first.pages, 50); page++)
    for (const r of (page === 1 ? first : await search(query, page)).roles)
      if (!posted.has(r.id)) fresh.set(r.id, r);
  const picked = pick([...fresh.values()]);
  if (!picked.length) return;
  const can = (await search("visa=can&within=1")).counts.visa.can ?? 0;
  const { roles, text } = fit(picked, { week: first.total, can, left: fresh.size - picked.length });
  if (dry) {
    console.log(text);
    return;
  }
  const id = await sql.begin(async (tx) => {
    const [post] = await tx<{ id: number }[]>`insert into channel_post (text) values (${text}) returning id`;
    if (!post) throw new Error("channel_post: no id");
    await tx`insert into channel_item ${tx(roles.map((r) => ({ post_id: post.id, posting_id: r.id })))}`;
    return post.id;
  });
  console.log(`${String(id)}\n${text}`);
}

export async function channelSent(id: number) {
  const done = await sql`update channel_post set sent_at = now() where id = ${id} and sent_at is null`;
  if (!done.count) throw new Error(`no unsent channel post ${String(id)}`);
}

// Telegram refused the post: nobody saw it, so its roles can go in the next one.
export async function channelDrop(id: number) {
  await sql`delete from channel_post where id = ${id} and sent_at is null`;
}
