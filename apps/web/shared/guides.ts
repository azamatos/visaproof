import type { VisaState } from "./answers";

// How developers get a work permit, for the countries researched (productContext.md → Visa rules by country). The
// amounts come from the visa_rule table with their sources and the date they were checked; this file holds only
// the words. A country missing here gets a page that says it isn't researched yet.

export type Guide = {
  route: string;
  intro: string;
  // visa_rule.rule → what it applies to, in the order shown
  amounts: { title: string; rules: Record<string, string> }[];
  period: string;
  limits?: string;
  sources: { text: string; href: string }[];
  meaning: { state: VisaState; text: string }[];
};

export const GUIDES: Record<string, Guide> = {
  DE: {
    route: "EU Blue Card",
    intro:
      "No sponsor licence is needed. Any employer can hire you on a Blue Card if the salary is at least the yearly minimum.",
    amounts: [
      {
        title: "Minimum a year",
        rules: {
          blue_card_reduced: "IT jobs, other shortage jobs, recent graduates",
          blue_card: "Other jobs",
        },
      },
    ],
    period: "Gross a year. The amounts change every January.",
    sources: [
      {
        text: "Federal Gazette (Bundesanzeiger), BAnz AT 18.12.2025 B3",
        href: "https://www.bundesanzeiger.de/pub/publication/REViP4bN6jVdpGxPaiQ/content/REViP4bN6jVdpGxPaiQ/BAnz%20AT%2018.12.2025%20B3.pdf",
      },
      { text: "Make it in Germany, the government's portal", href: "https://www.make-it-in-germany.com/en/" },
    ],
    meaning: [
      {
        state: "can",
        text: "The role posts a yearly salary at or above the minimum for IT jobs, so any employer can hire on a Blue Card.",
      },
      {
        state: "unknown",
        text: "The role posts no salary. Ask the recruiter for the range: if it clears the minimum, the employer can hire you.",
      },
    ],
  },
  NL: {
    route: "Highly Skilled Migrant permit",
    intro:
      "The employer must be an IND recognised sponsor. An employer that isn't on the register can't hire you on this permit, whatever its posting says.",
    amounts: [
      {
        title: "Highly Skilled Migrant, minimum a month",
        rules: {
          hsm_30_plus: "30 or older",
          hsm_under_30: "Under 30",
          hsm_reduced: "Reduced, e.g. recent graduates",
        },
      },
      {
        title: "EU Blue Card, minimum a month",
        rules: { blue_card: "Standard", blue_card_reduced: "Reduced" },
      },
    ],
    period: "Gross a month, not counting the 8% holiday allowance.",
    sources: [
      { text: "IND: required amounts", href: "https://ind.nl/en/required-amounts-income-requirements" },
      {
        text: "IND public register of recognised sponsors",
        href: "https://ind.nl/en/public-register-recognised-sponsors/public-register-work",
      },
    ],
    meaning: [
      {
        state: "sponsors",
        text: "The posting says it sponsors. The register result shows next to it on the job page, because the register decides.",
      },
      {
        state: "can",
        text: "The posting doesn't refuse, and we've confirmed the employer on the IND register.",
      },
      { state: "unknown", text: "The posting says nothing, and the employer isn't confirmed yet." },
      {
        state: "wont",
        text: "The posting refuses. An employer we confirm isn't on the register gets a warning on every role, whatever the posting says.",
      },
    ],
  },
  GB: {
    route: "Skilled Worker visa",
    intro:
      "The employer must hold a sponsor licence from the Home Office, and the salary must be at least the general threshold or the going rate for the job, whichever is higher.",
    amounts: [{ title: "Minimum a year", rules: { skilled_worker: "General threshold" } }],
    period: "Gross a year.",
    limits:
      "We don't check the going rate for each occupation yet, so a salary above the general threshold may still be too low for some jobs.",
    sources: [
      {
        text: "GOV.UK: Skilled Worker visa, your job",
        href: "https://www.gov.uk/skilled-worker-visa/your-job",
      },
      {
        text: "GOV.UK: register of licensed sponsors",
        href: "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers",
      },
    ],
    meaning: [
      {
        state: "can",
        text: "The posting doesn't refuse, and we've confirmed the employer holds a sponsor licence.",
      },
      { state: "unknown", text: "The posting says nothing, and the employer's licence isn't confirmed yet." },
      {
        state: "wont",
        text: "The posting refuses, often as “you must have the right to work in the UK”.",
      },
    ],
  },
};
