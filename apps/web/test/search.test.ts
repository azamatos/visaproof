import { describe, expect, it } from "vitest";
import { startPattern, wordPattern } from "../server/utils/search";

// Postgres' [[:alnum:]] is JavaScript's [\p{L}\p{N}] here: the same patterns, checked the same way.
const js = (pattern: string) => new RegExp(pattern.replaceAll("[:alnum:]", String.raw`\p{L}\p{N}`), "iu");

describe("search patterns", () => {
  it("matches the text as a whole word in a title", () => {
    expect(js(wordPattern("Go")).test("Senior Go Engineer")).toBe(true);
    expect(js(wordPattern("go")).test("Backend Engineer (Go)")).toBe(true);
    expect(js(wordPattern("go")).test("Google Cloud Engineer")).toBe(false);
    expect(js(wordPattern("C")).test("C++ Developer")).toBe(false);
    expect(js(wordPattern("C")).test("Embedded C Developer")).toBe(true);
    expect(js(wordPattern("C++")).test("Senior C++ Engineer")).toBe(true);
    expect(js(wordPattern(".NET")).test("ASP.NET Developer")).toBe(true);
    expect(js(wordPattern("java")).test("JavaScript Engineer")).toBe(false);
  });
  it("matches the start of a word in a company's name", () => {
    expect(js(startPattern("go")).test("GoCardless")).toBe(true);
    expect(js(startPattern("go")).test("Algolia")).toBe(false);
    expect(js(startPattern("exploration")).test("the-exploration-company")).toBe(true);
  });
  it("escapes what regular expressions would read", () => {
    expect(wordPattern("a.b(c)")).toBe(String.raw`(?<![[:alnum:]_])a\.b\(c\)`);
  });
});
