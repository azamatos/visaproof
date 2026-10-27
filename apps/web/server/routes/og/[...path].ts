import { RELOCATION_LABEL, type VisaState } from "#shared/answers";
import type { CompanyDetail } from "#shared/company";
import { COUNTRIES, inCountry } from "#shared/countries";
import type { CountryDetail } from "#shared/country";
import type { JobDetail } from "#shared/evidence";
import { GUIDES } from "#shared/guides";
import type { Stats } from "#shared/stats";
import { card, type Node, plainChip, png, visaChip } from "../../og/render";

// /og/site.png, /og/jobs/<id>.png, /og/companies/<ats>/<slug>.png, /og/countries/<code>.png: the picture a link to
// that page shows in a chat or a social post. Drawn from the same API answers as the page; Cloudflare keeps each
// for a day.

const n = (x: number) => x.toLocaleString("en-US");
const count = (x: number, one: string, many: string) => `${n(x)} ${x === 1 ? one : many}`;

async function site(): Promise<Node> {
  const s = await $fetch<Stats>("/api/stats");
  return card({
    title: "Developer jobs in Europe, visa answer first.",
    facts: `${count(s.roles, "open role", "open roles")} at ${count(s.companies, "company", "companies")}, read from their own job boards.`,
    chips: [visaChip("sponsors"), visaChip("may"), visaChip("can"), visaChip("wont")],
  });
}

async function job(id: string): Promise<Node> {
  const j = await $fetch<JobDetail>(`/api/jobs/${id}`);
  const helps = j.relocation === "helps" || j.relocation === "may";
  return card({
    eyebrow: j.company.name,
    title: j.title,
    facts: [j.place, j.workMode, j.salary].filter(Boolean).join(" · "),
    chips: [
      visaChip(j.visa),
      ...(helps ? [plainChip(RELOCATION_LABEL[j.relocation])] : []),
      ...(j.closedAt ? [plainChip("Closed")] : []),
    ],
  });
}

// What the company's postings say, in the words of its page (shared/company.ts).
const SAID = {
  sponsors: (x) => (x === 1 ? "1 role says it sponsors" : `${n(x)} roles say they sponsor`),
  may: (x) => `${count(x, "role", "roles")} may sponsor`,
  wont: (x) => `${count(x, "role", "roles")} won't sponsor`,
} satisfies Partial<Record<VisaState, (x: number) => string>>;

// The company page's answers in short: the quote it shows (a promise first, then a hedge, then a refusal), then
// its register and Blue Card checks.
async function company(path: string): Promise<Node> {
  const c = await $fetch<CompanyDetail>(`/api/companies/${path}`);
  const codes = c.countries.map((x) => x.code);
  const state = c.said.quoteState;
  const listed = (["GB", "NL"] as const).filter(
    (r) => c.registers[r].onRegister && (codes.includes(r) || c.registers[r].review),
  );
  const chips = [
    state === "sponsors" || state === "may" || state === "wont"
      ? visaChip(state, SAID[state](c.said[state]))
      : null,
    listed.length
      ? visaChip(
          "can",
          listed.length === 2
            ? "On the UK and Dutch registers"
            : `On the ${listed[0] === "GB" ? "UK" : "Dutch"} sponsor register`,
        )
      : null,
    codes.includes("DE") && c.blueCard?.clears ? visaChip("can", "Blue Card salary in Germany") : null,
  ].filter((x) => x !== null);
  return card({
    eyebrow: "Company",
    title: c.name,
    facts: `${count(c.open, "open role", "open roles")} for developers in Europe`,
    chips: chips.length ? chips : [visaChip("unknown")],
  });
}

async function country(code: string): Promise<Node> {
  const c = await $fetch<CountryDetail>(`/api/countries/${code}`);
  const guide = GUIDES[c.code];
  return card({
    eyebrow: "Country",
    title: `Developer jobs in ${inCountry(c.code)}`,
    facts: `${count(c.open, "open role", "open roles")} at ${count(c.companies, "company", "companies")}`,
    chips: guide ? [visaChip("can", guide.route)] : [],
  });
}

const notFound = () => createError({ statusCode: 404, statusMessage: "No such image" });

// The company's board path as the page sends it (each part URL-encoded), checked so it can only name a board.
function boardPath(path: string): string {
  const parts = path.split("/").map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      throw notFound();
    }
  });
  if (parts.length < 2 || parts.some((p) => !p || p === "." || p === "..")) throw notFound();
  return parts.map(encodeURIComponent).join("/");
}

// Images already drawn, for an hour per path (the query doesn't change them), the 500 used last: link previews ask
// for the same few again and again, and drawing one holds the server's only thread for about 0.15 s.
const HOUR = 60 * 60 * 1000;
const drawn = new Map<string, { at: number; png: Promise<Buffer> }>();
function draw(key: string, make: () => Promise<Node>): Promise<Buffer> {
  const hit = drawn.get(key);
  drawn.delete(key);
  if (hit && Date.now() - hit.at < HOUR) {
    drawn.set(key, hit);
    return hit.png;
  }
  const entry = { at: Date.now(), png: make().then(png) };
  // A failure isn't kept: the next request tries again.
  entry.png.catch(() => {
    if (drawn.get(key) === entry) drawn.delete(key);
  });
  drawn.set(key, entry);
  for (const old of drawn.keys()) {
    if (drawn.size <= 500) break;
    drawn.delete(old);
  }
  return entry.png;
}

export default defineEventHandler(async (event) => {
  assertMethod(event, "GET", true);
  const path = getRouterParam(event, "path") ?? "";
  const m = /^(?:(site)|jobs\/(\d{1,10})|companies\/(.+)|countries\/([a-z]{2}))\.png$/.exec(path);
  if (!m) throw notFound();
  const [, isSite, jobId, companyPath, code] = m;
  if (code && !(code.toUpperCase() in COUNTRIES)) throw notFound();
  const board = companyPath ? boardPath(companyPath) : undefined;
  let image: Buffer;
  try {
    image = await draw(path, () =>
      isSite ? site() : jobId ? job(jobId) : board ? company(board) : country(code ?? ""),
    );
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 404) throw notFound();
    throw e;
  }
  setResponseHeaders(event, {
    "content-type": "image/png",
    "cache-control": "public, max-age=86400",
  });
  return image;
});
