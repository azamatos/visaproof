import type { RelocationState, VisaState } from "./answers";
import { countryName } from "./countries";
import { salary } from "./format";

// One role, as the job page shows it: the facts, each answer and what it rests on. Dates are ISO strings.
export type Pay = { min: number; max: number; currency: string; period: string };
export type RegisterReview = { verdict: "listed" | "not_listed" | "unsure"; entry: string | null } | null;
export type JobDetail = {
  id: number;
  title: string;
  url: string;
  company: {
    name: string;
    path: string;
    board: string | null;
    boardName: string;
    others: number;
    postsForOthers: boolean;
  };
  place: string;
  workMode: string;
  countries: string[];
  pay: Pay | null;
  salary: string | null;
  posted: string;
  firstSeen: string;
  lastSeen: string;
  closedAt: string | null;
  technologies: { key: string; label: string }[];
  visa: VisaState;
  canIn: string[];
  visaQuote: string | null;
  // false when the board never sent the posting's text: nothing in it could be read.
  hasText: boolean;
  visaUnread: boolean;
  readAt: string | null;
  relocation: RelocationState;
  relocationQuote: string | null;
  languages: string[] | null;
  languageQuote: string | null;
  writtenIn: string | null;
  languagesReadAt: string | null;
  registers: { GB: RegisterReview; NL: RegisterReview };
  registerLoaded: { GB: string | null; NL: string | null };
  blueCard: {
    amount: number;
    currency: string;
    source: string;
    appliesFrom: string;
    checkedOn: string;
  } | null;
};

export type EvidenceItem = {
  label: string;
  kind: "visa" | "reloc" | "text";
  state?: VisaState | RelocationState;
  value?: string;
  tone?: "muted" | "refuse";
  quote?: string;
  note?: string;
  facts?: { k: string; v: string }[];
  source: string;
  checked?: string | null;
  link?: { text: string; to: string };
};

// "23 Oct 2026", in UTC so the server and the browser agree.
export const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

const money = (amount: number, currency: string) =>
  salary({ min: amount, max: amount, currency, period: "year" }) ?? "";
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const languageList = (xs: string[]) => xs.map(capital).join(", ");

// The countries with a sponsor register or a salary rule we check, and their pages.
const CHECKED = ["DE", "GB", "NL"];
const ROUTE: Record<string, string> = {
  DE: "Germany: how the Blue Card works",
  GB: "United Kingdom: how the Skilled Worker visa works",
  NL: "Netherlands: how permits work",
};
const REGISTER = {
  GB: {
    label: "UK sponsor register",
    source: "Home Office register of licensed sponsors",
    rule: "Only licensed sponsors can hire on a Skilled Worker visa.",
    listed: "a licensed sponsor",
  },
  NL: {
    label: "IND sponsor register",
    source: "IND public register of recognised sponsors",
    rule: "In the Netherlands only IND recognised sponsors can hire on a Highly Skilled Migrant permit.",
    listed: "an IND recognised sponsor",
  },
} as const;

// A company's check on one register: on it (and still there), not on it, not sure, or not checked yet. The job page
// and the company page say it the same way.
export function registerCheck(
  code: "GB" | "NL",
  c: { name: string; review: RegisterReview; loaded: string | null; onRegister: boolean },
  where = "",
): EvidenceItem {
  const r = REGISTER[code];
  const { review, name } = c;
  const base = {
    label: `${r.label}${where}`,
    source: r.source,
    checked: day(c.loaded),
    link: { text: ROUTE[code] ?? "", to: `/countries/${code.toLowerCase()}` },
  };
  if (review?.verdict === "listed" && c.onRegister)
    return {
      ...base,
      kind: "visa",
      state: "can",
      facts: [{ k: "On the register as", v: review.entry ?? "" }],
      note: `${r.rule} ${name} is ${r.listed}, so it can hire on one.`,
    };
  if (review?.verdict === "listed")
    return {
      ...base,
      kind: "text",
      value: "No longer listed",
      tone: "refuse",
      note: `${r.rule} We matched ${name} to “${review.entry ?? ""}”, which is no longer on the register.`,
    };
  if (review?.verdict === "not_listed")
    return {
      ...base,
      kind: "text",
      value: "Not on the register",
      tone: "refuse",
      note:
        code === "NL"
          ? `${r.rule} ${name} isn't one, so this route is closed, whatever the posting says.`
          : `${r.rule} ${name} isn't on the register, so it can't hire on one unless it gets a licence.`,
    };
  if (review?.verdict === "unsure")
    return {
      ...base,
      kind: "text",
      value: "Not sure",
      tone: "muted",
      note: `${r.rule} We couldn't tell which company employs for this role: the board posts for several, or the name matches more than one entry.`,
    };
  return {
    ...base,
    kind: "text",
    value: "Not checked yet",
    tone: "muted",
    note: `${r.rule} We haven't confirmed ${name}'s entry yet: company names rarely match the register's legal names, so we check employers by hand, biggest first.`,
  };
}

function blueCardCheck(job: JobDetail, where: string): EvidenceItem | null {
  const rule = job.blueCard;
  if (!rule) return null;
  const minimum = money(rule.amount, rule.currency);
  const base = {
    label: `Blue Card check${where}`,
    source: rule.source,
    checked: day(rule.checkedOn),
    link: { text: ROUTE.DE ?? "", to: "/countries/de" },
  };
  const pay = job.pay;
  const yearly =
    pay?.currency === rule.currency && (pay.period === "year" || pay.period === "month")
      ? pay.min * (pay.period === "month" ? 12 : 1)
      : null;
  if (yearly === null)
    return {
      ...base,
      kind: "text",
      value: pay ? "Can't compare" : "Salary not posted",
      tone: "muted",
      note: pay
        ? `In Germany any employer can hire on an EU Blue Card if the salary is at least ${minimum} for IT jobs. The posted range is in ${pay.currency} or by the ${pay.period}, so we don't compare it.`
        : `In Germany any employer can hire on an EU Blue Card if the salary is at least ${minimum} for IT jobs. The posting gives no salary.`,
    };
  const facts = [
    { k: "Lowest posted salary", v: money(yearly, rule.currency) },
    { k: `${String(new Date(rule.appliesFrom).getUTCFullYear())} minimum, IT jobs`, v: minimum },
  ];
  return job.canIn.includes("DE")
    ? {
        ...base,
        kind: "visa",
        state: "can",
        facts,
        note: "The salary clears the minimum. In Germany any employer can hire on an EU Blue Card at this pay; no sponsor licence is needed.",
      }
    : {
        ...base,
        kind: "text",
        value: "Below the minimum",
        tone: "refuse",
        facts,
        note: "The lowest posted salary is below the EU Blue Card minimum. Another permit may still be possible: ask the employer.",
      };
}

// What each answer on the job page rests on, in the order the page shows them, and the next step when the answer
// is "Unknown".
export function evidence(job: JobDetail): { items: EvidenceItem[]; next: string | null } {
  const items: EvidenceItem[] = [];
  const name = job.company.name;
  const fromPosting = { source: "From the posting", checked: day(job.readAt ?? job.lastSeen) };

  // The posting's own words first.
  const noText = {
    kind: "text",
    value: "No text yet",
    tone: "muted",
    note: "The board didn't send this posting's text, so we couldn't read it. We ask again on every read; until then the answer rests on the law and the registers alone.",
    source: "From the posting",
  } as const;
  if (!job.hasText) items.push({ label: "Visa · the posting", ...noText });
  else if (job.visaUnread)
    items.push({
      label: "Visa · the posting",
      kind: "text",
      value: "Not read yet",
      tone: "muted",
      note: "The posting mentions visas, permits or relocation. We read new postings every night; until then the answer rests on the law and the registers alone.",
      source: "From the posting",
    });
  else if (job.visa === "sponsors" || job.visa === "may" || job.visa === "wont")
    items.push({
      label: "Visa",
      kind: "visa",
      state: job.visa,
      quote: job.visaQuote ?? undefined,
      ...fromPosting,
    });
  else
    items.push({
      label: "Visa · the posting",
      kind: "text",
      value: "Says nothing",
      tone: "muted",
      note:
        job.visa === "can"
          ? "The posting doesn't mention visas or work permits. The answer comes from the law, below."
          : "The posting doesn't mention visas or work permits. Most postings don't: about 4 in 5 of the roles we read.",
      ...fromPosting,
    });

  // Then the law, for each country of the role we check.
  const several = job.countries.length > 1;
  for (const code of job.countries.filter((c) => CHECKED.includes(c))) {
    const where = several ? ` · ${countryName(code)}` : "";
    if (code === "DE") {
      const check = blueCardCheck(job, where);
      if (check) items.push(check);
    } else {
      const register = code as "GB" | "NL";
      items.push(
        registerCheck(
          register,
          {
            name,
            review: job.registers[register],
            loaded: job.registerLoaded[register],
            onRegister: job.canIn.includes(register),
          },
          where,
        ),
      );
    }
  }
  const others = job.countries.filter((c) => !CHECKED.includes(c)).map(countryName);
  if (others.length)
    items.push({
      label: `Employer check · ${others.length > 2 ? `${String(others.length)} countries` : others.join(", ")}`,
      kind: "text",
      value: "No register",
      tone: "muted",
      note: `We don't check a sponsor register or a salary rule for ${others.length > 2 ? "these countries" : others.join(" or ")} yet, so the visa answer there rests on the posting alone.`,
      source: "Country note",
    });
  else if (!job.countries.length)
    items.push({
      label: "Employer check",
      kind: "text",
      value: "Depends on where you work",
      tone: "muted",
      note: "This role is remote across Europe. Whether you need a permit, and which, depends on the country you'd work from.",
      source: "Country note",
    });

  if (!job.hasText) items.push({ label: "Relocation", ...noText, note: "We couldn't read the posting." });
  else if (job.visaUnread)
    items.push({
      label: "Relocation",
      kind: "text",
      value: "Not read yet",
      tone: "muted",
      note: "We read new postings every night.",
      source: "From the posting",
    });
  else
    items.push({
      label: "Relocation",
      kind: "reloc",
      state: job.relocation,
      ...(job.relocation === "silent"
        ? { note: "The posting says nothing about relocation." }
        : { quote: job.relocationQuote ?? undefined }),
      ...fromPosting,
    });

  const languagesChecked = { source: "From the posting", checked: day(job.languagesReadAt) };
  if (!job.hasText) items.push({ label: "Languages", ...noText, note: "We couldn't read the posting." });
  else if (job.languages === null)
    items.push({
      label: "Languages",
      kind: "text",
      value: "Not read yet",
      tone: "muted",
      note: "We check every posting for languages it requires; this one is next in line.",
      source: "From the posting",
    });
  else if (!job.languages.length)
    items.push({
      label: "Languages",
      kind: "text",
      value: "English only",
      note: "The posting asks for no other language.",
      ...languagesChecked,
    });
  else
    items.push({
      label: "Languages",
      kind: "text",
      value: `${languageList(job.languages)} required`,
      ...(job.languageQuote
        ? { quote: job.languageQuote }
        : { note: `The posting is written in ${capital(job.writtenIn ?? job.languages[0] ?? "")}.` }),
      ...languagesChecked,
    });

  let next: string | null = null;
  if (job.visa === "unknown") {
    if (job.countries.includes("NL") && !job.registers.NL)
      next = `ask the recruiter whether ${name} is an IND recognised sponsor.`;
    else if (job.countries.includes("GB") && !job.registers.GB)
      next = `ask the recruiter whether ${name} holds a UK sponsor licence.`;
    else if (job.countries.includes("DE") && !job.pay && job.blueCard)
      next = `ask the recruiter for the salary: the Blue Card needs at least ${money(job.blueCard.amount, job.blueCard.currency)}.`;
    else next = `ask the recruiter whether ${name} sponsors work permits for this role.`;
  }
  return { items, next };
}
