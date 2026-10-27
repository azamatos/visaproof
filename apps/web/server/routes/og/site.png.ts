import type { RoleCard } from "#shared/answers";
import type { Stats } from "#shared/stats";
import { png, siteImage } from "../../og/render";

// /og/site.png: the picture a link to any page shows in a chat or a social post, drawn from the same API answers as
// the site. Drawn at most once an hour (drawing holds the server's only thread for a moment); Cloudflare and the
// link previews keep it too.

type Search = { roles: RoleCard[] };
const HOUR = 60 * 60 * 1000;
let drawn: { at: number; png: Promise<Buffer> } | undefined;

const n = (x: number) => x.toLocaleString("en-US");

async function draw(): Promise<Buffer> {
  const [s, search] = await Promise.all([
    $fetch<Stats>("/api/stats"),
    $fetch<Search>("/api/roles", { query: { visa: "sponsors", sort: "newest" } }),
  ]);
  // The newest roles that sponsor, one per company
  const roles = search.roles
    .filter((r, i, all) => all.findIndex((x) => x.company === r.company) === i)
    .slice(0, 3);
  const facts = `${n(s.roles)} open ${s.roles === 1 ? "role" : "roles"} at ${n(s.companies)} ${s.companies === 1 ? "company" : "companies"}, read from their own job boards.`;
  return png(siteImage(facts, roles));
}

export default defineEventHandler(async (event) => {
  assertMethod(event, "GET", true);
  if (!drawn || Date.now() - drawn.at > HOUR) {
    const entry = { at: Date.now(), png: draw() };
    // A failure isn't kept: the next request tries again.
    entry.png.catch(() => {
      if (drawn === entry) drawn = undefined;
    });
    drawn = entry;
  }
  const image = await drawn.png;
  setResponseHeaders(event, { "content-type": "image/png", "cache-control": "public, max-age=3600" });
  return image;
});
