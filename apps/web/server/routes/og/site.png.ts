import type { RoleCard } from "#shared/answers";
import type { Stats } from "#shared/stats";
import { png, siteImage } from "../../og/render";

// /og/site.png: the picture a link to any page shows in a chat or a social post, drawn from the same API answers as
// the site. Drawn at most once an hour (drawing holds the server's only thread for a moment); Cloudflare and the
// link previews keep it too.

type Search = { roles: RoleCard[] };
const HOUR = 60 * 60 * 1000;
// The image being drawn or last drawn, and the last one that worked: a redraw that fails keeps the older image.
let drawn: { at: number; png: Promise<Buffer> } | undefined;
let good: Buffer | undefined;

const n = (x: number) => x.toLocaleString("en-US");

async function draw(): Promise<Buffer> {
  const [s, search] = await Promise.all([
    $fetch<Stats>("/api/stats"),
    $fetch<Search>("/api/roles", { query: { visa: "sponsors", sort: "newest" } }),
  ]);
  // The newest roles that sponsor, one per company: three fit
  const roles = search.roles
    .filter((r, i, all) => all.findIndex((x) => x.company === r.company) === i)
    .slice(0, 3);
  const facts = `${n(s.roles)} open ${s.roles === 1 ? "role" : "roles"} at ${n(s.companies)} ${s.companies === 1 ? "company" : "companies"}, read from their own job boards.`;
  return png(siteImage(facts, roles));
}

export default defineEventHandler(async (event) => {
  assertMethod(event, "GET", true);
  if (!drawn || Date.now() - drawn.at > HOUR) drawn = { at: Date.now(), png: draw() };
  let image: Buffer;
  try {
    image = await drawn.png;
    good = image;
  } catch (e) {
    // Try again on the next request; meanwhile the last good image, if there is one
    drawn = undefined;
    if (!good) throw e;
    image = good;
  }
  setResponseHeaders(event, { "content-type": "image/png", "cache-control": "public, max-age=3600" });
  return image;
});
