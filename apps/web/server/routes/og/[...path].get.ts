import { RELOCATION_LABEL } from "#shared/answers";
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
const roles = (x: number) => `${n(x)} open ${x === 1 ? "role" : "roles"}`;

async function site(): Promise<Node> {
  const s = await $fetch<Stats>("/api/stats");
  return card({
    title: "Developer jobs in Europe, visa answer first.",
    facts: `${roles(s.roles)} at ${n(s.companies)} companies, read from their own job boards.`,
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

async function company(path: string): Promise<Node> {
  const c = await $fetch<CompanyDetail>(`/api/companies/${path}`);
  const listed = (["GB", "NL"] as const).find((r) => c.registers[r].onRegister);
  const chip = c.said.sponsors
    ? visaChip("sponsors", `${n(c.said.sponsors)} say they sponsor`)
    : c.said.may
      ? visaChip("may", `${n(c.said.may)} may sponsor`)
      : listed
        ? visaChip("can", listed === "GB" ? "On the UK sponsor register" : "On the Dutch sponsor register")
        : visaChip("unknown");
  return card({
    eyebrow: "Company",
    title: c.name,
    facts: `${roles(c.open)} for developers in Europe`,
    chips: [chip],
  });
}

async function country(code: string): Promise<Node> {
  const c = await $fetch<CountryDetail>(`/api/countries/${code}`);
  const guide = GUIDES[c.code];
  return card({
    eyebrow: "Country",
    title: `Developer jobs in ${inCountry(c.code)}`,
    facts: `${roles(c.open)} at ${n(c.companies)} companies`,
    chips: guide ? [visaChip("can", guide.route)] : [],
  });
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path") ?? "";
  const m = /^(?:(site)|jobs\/(\d+)|companies\/(.+)|countries\/([a-z]{2}))\.png$/.exec(path);
  if (!m) throw createError({ statusCode: 404, statusMessage: "No such image" });
  const [, isSite, jobId, companyPath, code] = m;
  let node: Node;
  try {
    node = isSite
      ? await site()
      : jobId
        ? await job(jobId)
        : companyPath
          ? await company(companyPath)
          : code && code.toUpperCase() in COUNTRIES
            ? await country(code)
            : await site();
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404) throw createError({ statusCode: 404, statusMessage: "No such page" });
    throw e;
  }
  setResponseHeaders(event, {
    "content-type": "image/png",
    "cache-control": "public, max-age=86400",
  });
  return png(node);
});
