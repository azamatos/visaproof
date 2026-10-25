// Search text as Postgres regular expressions. A word must stand on its own ("Go" finds "Senior Go Engineer", not
// "Google"; "C" doesn't find "C++"), and a word that ends in a symbol keeps it ("C++", ".NET").

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startsWord = (s: string) => /^[\p{L}\p{N}]/u.test(s);
const endsWord = (s: string) => /[\p{L}\p{N}]$/u.test(s);

/** The whole text as a word, in a title. */
export function wordPattern(q: string): string {
  return `${startsWord(q) ? "(?<![[:alnum:]_])" : ""}${escape(q)}${endsWord(q) ? "(?![[:alnum:]_+#])" : ""}`;
}

/** The text at the start of a word, in a company's name: "go" finds "GoCardless", not "Algolia". */
export function startPattern(q: string): string {
  return `${startsWord(q) ? "(?<![[:alnum:]_])" : ""}${escape(q)}`;
}
