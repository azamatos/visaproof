import { describe, expect, it } from "vitest";
import { age, place, salary } from "../shared/format";

describe("place", () => {
  it("names the city and the country", () => {
    expect(place("Dublin; Dublin, Dublin, Ireland", ["IE"], "onsite", "")).toBe("Dublin, Ireland");
    expect(place("Sunnyvale, CA; London, UK", ["GB"], "hybrid", "")).toBe("London, United Kingdom");
    expect(place("Germany", ["DE"], "onsite", "")).toBe("Germany");
  });
  it("pairs each city with its own country when there are two", () => {
    expect(
      place(
        "London, England, United Kingdom (Hybrid) ; Berlin, Germany (Hybrid)",
        ["DE", "GB"],
        "hybrid",
        "",
      ),
    ).toBe("Berlin, Germany or London, United Kingdom");
    expect(place("Garching b. München (DE); Innsbruck (AT)", ["AT", "DE"], "onsite", "")).toBe(
      "Innsbruck, Austria or Garching b. München, Germany",
    );
  });
  it("says where remote work is allowed", () => {
    expect(place("Remote", [], "remote", "europe")).toBe("Remote in Europe");
    expect(place("Remote - Spain, Portugal", ["ES", "PT"], "remote", "country")).toBe(
      "Remote in Spain or Portugal",
    );
  });
});

describe("salary and age", () => {
  it("shows the range as posted", () => {
    expect(salary({ min: 40000, max: 150000, currency: "EUR", period: "year" })).toBe(
      "€40,000–150,000 a year",
    );
    expect(salary(null)).toBeNull();
  });
  it("says how long ago, up to years", () => {
    const now = Date.parse("2026-10-25T12:00:00Z");
    expect(age("2026-10-25T08:00:00Z", now)).toBe("Today");
    expect(age("2026-10-20T08:00:00Z", now)).toBe("5 days ago");
    expect(age("2024-01-01T00:00:00Z", now)).toBe("2 years ago");
  });
});
