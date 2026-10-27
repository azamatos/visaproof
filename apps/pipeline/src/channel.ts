import { sql } from "./db.ts";
import { count, esc, n } from "./text.ts";

// The public Telegram channel's daily post: the roles posted in the last week whose posting says the employer
// sponsors a visa (or may), not in an earlier post, newest first; then how many new roles are at employers that
// can sponsor (a register, a Blue Card salary). Each role links to its page on the site, which quotes the evidence
// and links to the original: no posting text here (AGENTS.md, rule 3). The roles come from the site's own search,
// with their countries, city and remote reach, so the post groups them by country and its places, pay and answers
// read as they do on the site (techContext.md, decisions). deploy/channel.sh sends the post, then marks it sent, or
// drops it when Telegram refuses it.

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
  countries: string[];
  city: string;
  remote: "anywhere" | "europe" | "countries" | null;
};
type Search = { total: number; pages: number; roles: Card[]; counts: { visa: Record<string, number> } };

const day = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// "DE" → 🇩🇪
const flag = (code: string) =>
  String.fromCodePoint(0x1f1a5 + code.charCodeAt(0), 0x1f1a5 + code.charCodeAt(1));

export type Tail = {
  more: number; // roles from the week that sponsor or may, not in this post or an earlier one
  week: number; // all roles from the week that sponsor or may, as the linked search lists them
  can: number; // roles from the last day at employers that can sponsor
};

// The group a role goes under: its country, remote across Europe or anywhere, or several countries.
type Group = { key: string; head: string; tag: string | null };
function groupOf(r: Card): Group {
  if (r.remote === "anywhere")
    return { key: "~anywhere", head: "🌍 <b>Remote, anywhere</b>", tag: "#RemoteAnywhere" };
  if (r.remote === "europe")
    return { key: "~europe", head: "🇪🇺 <b>Remote in Europe</b>", tag: "#RemoteEurope" };
  const [code, ...more] = r.countries;
  if (!code || more.length) return { key: "~several", head: "🗺 <b>Several countries</b>", tag: null };
  const name = REGION.of(code) ?? code;
  return { key: code, head: `${flag(code)} <b>${esc(name)}</b>`, tag: `#${name.replace(/[^A-Za-z]/g, "")}` };
}

// One line per role: the title links to the role's page, then the company and where (the city under a country, or
// the site's own place under "Several countries"), the pay, its language, and what it says about a visa and moving
// when that isn't a plain yes.
function line(r: Card, site: string, group: Group): string {
  const where =
    group.key === "~several"
      ? r.place
      : r.remote === "countries"
        ? "Remote"
        : group.key.startsWith("~")
          ? ""
          : r.city;
  const facts = [
    esc([r.company, where].filter(Boolean).join(", ")),
    r.salary ? esc(r.salary) : "",
    r.languages === null
      ? "<i>language not checked yet</i>"
      : r.languages.length
        ? `🗣 ${esc(r.languages.map(capital).join(", "))}`
        : "",
    r.visa === "may" ? "<i>may sponsor</i>" : "",
    r.relocation === "may" ? "<i>may help you move</i>" : r.relocation === "no" ? "<i>no relocation</i>" : "",
  ].filter(Boolean);
  return `• <a href="${site}/jobs/${String(r.id)}">${esc(r.title)}</a> · ${facts.join(" · ")}${r.relocation === "helps" ? " ✈️" : ""}`;
}

// The post in Telegram's HTML: the roles by country, the countries with most roles first, then remote and several
// countries.
export function channelMessage(roles: Card[], tail: Tail, now = new Date(), site = SITE): string {
  const groups = new Map<string, { group: Group; roles: Card[] }>();
  for (const r of roles) {
    const group = groupOf(r);
    const g = groups.get(group.key) ?? { group, roles: [] };
    g.roles.push(r);
    groups.set(group.key, g);
  }
  const last = (key: string) => (key.startsWith("~") ? 1 : 0);
  const ordered = [...groups.values()].sort(
    (a, b) => last(a.group.key) - last(b.group.key) || b.roles.length - a.roles.length,
  );
  const sections = ordered.map(({ group, roles: rs }) =>
    [group.head, ...rs.map((r) => line(r, site, group))].join("\n"),
  );
  const tags = ordered.flatMap(({ group }) => (group.tag ? [group.tag] : []));
  const tail_ = [
    tail.more
      ? `<a href="${site}/?visa=may&amp;within=7&amp;sort=newest">All ${n(tail.week)} from the last week</a>`
      : "",
    tail.can
      ? `${count(tail.can, "new role")} at employers on a sponsor register or paying a Blue Card salary: <a href="${site}/?visa=can&amp;within=1&amp;sort=newest">see them</a>`
      : "",
    tags.join(" "),
  ].filter(Boolean);
  return [
    `<b>New developer roles that sponsor a visa</b> · ${day.format(now)}\nEach posting says the employer sponsors a visa, or may. Tap a role for the exact sentence and where to apply.\n✈️ helps you move · 🗣 a local language needed`,
    ...sections,
    ...(tail_.length ? [tail_.join("\n")] : []),
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
