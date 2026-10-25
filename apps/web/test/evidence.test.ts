import { describe, expect, it } from "vitest";
import { evidence, type JobDetail } from "../shared/evidence";

const job = (over: Partial<JobDetail> = {}): JobDetail => ({
  id: 1,
  title: "Software Engineer",
  url: "https://example.com/jobs/1",
  company: {
    name: "Acme",
    path: "/companies/ashby/acme",
    board: null,
    boardName: "Ashby",
    others: 0,
    postsForOthers: false,
  },
  place: "Berlin, Germany",
  workMode: "On-site",
  countries: ["DE"],
  pay: null,
  salary: null,
  posted: "2026-10-01T00:00:00Z",
  firstSeen: "2026-10-22T00:00:00Z",
  lastSeen: "2026-10-24T12:00:00Z",
  closedAt: null,
  technologies: [],
  visa: "unknown",
  canIn: [],
  visaQuote: null,
  hasText: true,
  visaUnread: false,
  readAt: null,
  relocation: "silent",
  relocationQuote: null,
  languages: [],
  languageQuote: null,
  writtenIn: null,
  languagesReadAt: "2026-10-24T01:00:00Z",
  registers: { GB: null, NL: null },
  registerLoaded: { GB: "2026-10-24T06:00:00Z", NL: "2026-10-24T06:00:00Z" },
  blueCard: {
    amount: 45934.2,
    currency: "EUR",
    source: "Federal Gazette",
    appliesFrom: "2026-01-01T00:00:00Z",
    checkedOn: "2026-10-24T00:00:00Z",
  },
  ...over,
});
const labels = (j: JobDetail) => evidence(j).items.map((i) => `${i.label}: ${i.value ?? i.state ?? ""}`);

describe("evidence", () => {
  it("quotes the posting when it speaks", () => {
    const { items, next } = evidence(
      job({ visa: "sponsors", visaQuote: "We sponsor visas", readAt: "2026-10-24T01:00:00Z" }),
    );
    expect(items[0]).toMatchObject({
      label: "Visa",
      kind: "visa",
      state: "sponsors",
      quote: "We sponsor visas",
      checked: "24 Oct 2026",
    });
    expect(next).toBeNull();
  });
  it("checks the Blue Card salary in Germany", () => {
    const can = evidence(
      job({ visa: "can", canIn: ["DE"], pay: { min: 80000, max: 90000, currency: "EUR", period: "year" } }),
    );
    expect(can.items[1]).toMatchObject({ label: "Blue Card check", state: "can" });
    expect(can.items[1]?.facts).toEqual([
      { k: "Lowest posted salary", v: "€80,000 a year" },
      { k: "2026 minimum, IT jobs", v: "€45,934 a year" },
    ]);
    // The year the amount applies from, not the day we checked it.
    const next = job({
      pay: { min: 80000, max: 90000, currency: "EUR", period: "year" },
      blueCard: {
        amount: 48000,
        currency: "EUR",
        source: "Federal Gazette",
        appliesFrom: "2027-01-01T00:00:00Z",
        checkedOn: "2026-12-20T00:00:00Z",
      },
    });
    expect(evidence(next).items[1]?.facts?.[1]?.k).toBe("2027 minimum, IT jobs");
    const low = evidence(job({ pay: { min: 3000, max: 3500, currency: "EUR", period: "month" } }));
    expect(low.items[1]).toMatchObject({ value: "Below the minimum", tone: "refuse" });
    const none = evidence(job());
    expect(none.items[1]).toMatchObject({ value: "Salary not posted" });
    expect(none.next).toContain("ask the recruiter for the salary");
  });
  it("checks each country of the role on its own", () => {
    const j = job({
      countries: ["DE", "GB"],
      visa: "can",
      canIn: ["GB"],
      registers: { GB: { verdict: "listed", entry: "ACME LTD" }, NL: null },
    });
    expect(labels(j)).toEqual([
      "Visa · the posting: Says nothing",
      "Blue Card check · Germany: Salary not posted",
      "UK sponsor register · United Kingdom: can",
      "Relocation: silent",
      "Languages: English only",
    ]);
  });
  it("warns when a Dutch employer isn't a recognised sponsor, whatever the posting says", () => {
    const j = job({
      countries: ["NL"],
      visa: "sponsors",
      visaQuote: "We sponsor visas",
      registers: { GB: null, NL: { verdict: "not_listed", entry: null } },
    });
    expect(evidence(j).items[1]).toMatchObject({ value: "Not on the register", tone: "refuse" });
    expect(evidence(j).items[1]?.note).toContain("route is closed");
  });
  it("says what isn't read yet instead of guessing", () => {
    expect(labels(job({ visaUnread: true, languages: null, countries: ["FR"] }))).toEqual([
      "Visa · the posting: Not read yet",
      "Employer check · France: No register",
      "Relocation: Not read yet",
      "Languages: Not read yet",
    ]);
  });
  it("says so when the board never sent the posting's text", () => {
    expect(labels(job({ hasText: false, languages: null, countries: ["FR"] }))).toEqual([
      "Visa · the posting: No text yet",
      "Employer check · France: No register",
      "Relocation: No text yet",
      "Languages: No text yet",
    ]);
  });
  it("names a required language with its sentence, or the posting's own language", () => {
    expect(
      evidence(job({ languages: ["german"], languageQuote: "Fließend Deutsch" })).items.at(-1),
    ).toMatchObject({
      value: "German required",
      quote: "Fließend Deutsch",
    });
    expect(evidence(job({ languages: ["german"], writtenIn: "german" })).items.at(-1)?.note).toBe(
      "The posting is written in German.",
    );
  });
});
