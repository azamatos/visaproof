import type { RoleCard, VisaState } from "./answers";
import { countryName } from "./countries";
import { day, type EvidenceItem, type RegisterReview, registerCheck } from "./evidence";
import { salary } from "./format";

// One company's board, as its page shows it: its roles, what its postings say about visas, and its checks.
export type CompanyDetail = {
  name: string;
  board: string | null;
  boardName: string;
  postsForOthers: boolean;
  lastRead: string | null;
  open: number;
  countries: { code: string; n: number }[];
  said: { sponsors: number; may: number; wont: number; quote: string | null; quoteState: VisaState | null };
  unread: number;
  noText: number;
  registers: {
    GB: { review: RegisterReview; onRegister: boolean };
    NL: { review: RegisterReview; onRegister: boolean };
  };
  registerLoaded: { GB: string | null; NL: string | null };
  blueCard: { amount: number; currency: string; inGermany: number; clears: number } | null;
  roles: RoleCard[];
  page: number;
  pages: number;
  perPage: number;
};

// What the company's page says about hiring on a visa: its postings' own words, then the law for each country it
// hires in.
export function companyEvidence(c: CompanyDetail): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const { sponsors, may, wont } = c.said;
  const of = (x: number) => `${String(x)} of ${String(c.open)}`;
  const unread = (more: string) =>
    c.unread
      ? ` ${String(c.unread)} ${more}mention${c.unread === 1 ? "s" : ""} visas and ${c.unread === 1 ? "is" : "are"} read tonight.`
      : "";
  const noText = c.noText
    ? ` ${String(c.noText)} ${c.noText === 1 ? "has" : "have"} no text yet: the board didn't send it.`
    : "";
  const quiet = c.open - c.unread - c.noText;
  if (c.said.quote && c.said.quoteState)
    items.push({
      label: "What its postings say",
      kind: "visa",
      state: c.said.quoteState,
      quote: c.said.quote,
      note: `${[
        sponsors ? `${of(sponsors)} roles say they sponsor` : "",
        may ? `${of(may)} may` : "",
        wont ? `${of(wont)} refuse` : "",
      ]
        .filter(Boolean)
        .join(", ")}.${unread("more ")}`,
      source: "From its postings",
    });
  else
    items.push({
      label: "What its postings say",
      kind: "text",
      value: c.unread ? "Nothing yet" : "Nothing",
      tone: "muted",
      note:
        quiet === c.open
          ? `None of its ${String(c.open)} open roles says anything about visas or work permits.`
          : `${of(quiet)} open roles say${quiet === 1 ? "s" : ""} nothing about visas or work permits.${unread("")}${noText}`,
      source: "From its postings",
    });

  const codes = c.countries.map((x) => x.code);
  for (const code of ["GB", "NL"] as const)
    if (codes.includes(code) || c.registers[code].review)
      items.push(
        registerCheck(code, {
          name: c.name,
          review: c.registers[code].review,
          loaded: c.registerLoaded[code],
          onRegister: c.registers[code].onRegister,
        }),
      );
  if (codes.includes("DE") && c.blueCard) {
    const minimum = salary({
      min: c.blueCard.amount,
      max: c.blueCard.amount,
      currency: c.blueCard.currency,
      period: "year",
    });
    items.push({
      label: "Blue Card check · Germany",
      kind: c.blueCard.clears ? "visa" : "text",
      state: c.blueCard.clears ? "can" : undefined,
      value: c.blueCard.clears ? undefined : "No salary clears it",
      tone: c.blueCard.clears ? undefined : "muted",
      note: `No sponsor licence is needed in Germany: any employer can hire on an EU Blue Card if the salary is at least ${minimum ?? ""} for IT jobs. ${String(c.blueCard.clears)} of its ${String(c.blueCard.inGermany)} roles there post a salary that clears it; the others post none, or less.`,
      source: "Federal Gazette (Bundesanzeiger)",
      link: { text: "Germany: how the Blue Card works", to: "/countries/de" },
    });
  }
  const others = codes.filter((x) => !["DE", "GB", "NL"].includes(x)).map(countryName);
  if (others.length)
    items.push({
      label: `Employer check · ${others.length > 2 ? `${String(others.length)} more countries` : others.join(", ")}`,
      kind: "text",
      value: "No register",
      tone: "muted",
      note: "We don't check a sponsor register or a salary rule there yet, so the answer rests on each posting alone.",
      source: "Country note",
    });
  return items;
}

// "Roles in Germany, Spain and the United Kingdom", or "… and 4 more countries".
export function hiresIn(c: CompanyDetail): string {
  const names = c.countries.map((x) => countryName(x.code));
  if (!names.length) return "Remote roles across Europe";
  if (names.length <= 3)
    return `Roles in ${names.length === 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`}`;
  return `Roles in ${names.slice(0, 3).join(", ")} and ${String(names.length - 3)} more countries`;
}

export const lastRead = (c: CompanyDetail) => day(c.lastRead);
