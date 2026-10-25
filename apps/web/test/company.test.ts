import { describe, expect, it } from "vitest";
import { type CompanyDetail, companyEvidence } from "../shared/company";

const company = (over: Partial<CompanyDetail> = {}): CompanyDetail => ({
  name: "Fjord Systems",
  board: null,
  boardName: "Ashby",
  postsForOthers: false,
  lastRead: null,
  open: 5,
  countries: [{ code: "FR", n: 5 }],
  said: { sponsors: 0, may: 0, wont: 0, quote: null, quoteState: null },
  unread: 0,
  noText: 0,
  registers: { GB: { review: null, onRegister: false }, NL: { review: null, onRegister: false } },
  registerLoaded: { GB: null, NL: null },
  blueCard: null,
  roles: [],
  page: 1,
  pages: 1,
  perPage: 50,
  ...over,
});

describe("company evidence", () => {
  it("says none of the roles mentions visas only when that's true", () => {
    expect(companyEvidence(company())[0]).toMatchObject({
      value: "Nothing",
      note: "None of its 5 open roles says anything about visas or work permits.",
    });
    expect(companyEvidence(company({ unread: 2, noText: 1 }))[0]).toMatchObject({
      value: "Nothing yet",
      note: "2 of 5 open roles say nothing about visas or work permits. 2 mention visas and are read tonight. 1 has no text yet: the board didn't send it.",
    });
  });
});
