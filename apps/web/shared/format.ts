import { COUNTRIES, countryName } from "./countries";

const or = (xs: string[]) =>
  xs.length <= 2 ? xs.join(" or ") : `${xs.slice(0, -1).join(", ")} or ${xs.at(-1) ?? ""}`;
const NOT_A_CITY = new Set(
  [
    ...Object.keys(COUNTRIES),
    ...Object.values(COUNTRIES),
    "Europe",
    "EMEA",
    "EU",
    "Remote",
    "Hybrid",
    "UK",
  ].map((s) => s.toLowerCase()),
);

// "Dublin; Dublin, Dublin, Ireland" → "Dublin, Ireland"; "London, UK; Berlin, Germany" → "London, United Kingdom or
// Berlin, Germany"; remote roles say where remote is allowed.
export function place(raw: string, all: string[], mode: string, scope: string): string {
  // Only the countries Visaproof covers: a role in Skopje and Amsterdam is shown as Amsterdam's.
  const countries = all.filter((c) => c in COUNTRIES);
  const names = countries.map(countryName);
  if (mode === "remote") {
    if (scope === "worldwide") return "Remote, anywhere";
    if (scope === "europe" || !names.length) return "Remote in Europe";
    return `Remote in ${or(names)}`;
  }
  const segments = raw.split(";").map((x) => x.trim());
  const isIn = (c: string, x: string) =>
    new RegExp(`\\b(${c}|${countryName(c)}${c === "GB" ? "|UK|England|Scotland|Wales" : ""})\\b`, "i").test(
      x,
    );
  // The city of a place: "Garching b. München (DE)" → "Garching b. München"; none for "Remote" or "Germany".
  const cityOf = (segment: string | undefined) => {
    const city = (segment ?? "")
      .replace(/\([^)]*\)/g, "")
      .split(",")[0]
      ?.replace(/\b(office|remote|hybrid|on-?site)\b/gi, "")
      .replace(/[-–(]\s*$/, "")
      .trim();
    return city && !NOT_A_CITY.has(city.toLowerCase()) ? city : "";
  };
  if (names.length === 2) {
    return countries
      .map((c) => {
        const city = cityOf(segments.find((x) => isIn(c, x)));
        return city ? `${city}, ${countryName(c)}` : countryName(c);
      })
      .join(" or ");
  }
  // The city of the first listed place in one of the role's countries: "Sunnyvale, CA; London, UK" → London.
  const city = cityOf(
    segments.length === 1 ? segments[0] : segments.find((x) => countries.some((c) => isIn(c, x))),
  );
  const where = names.length > 2 ? `${String(names.length)} countries` : (names[0] ?? "");
  if (!city) return where || raw;
  return where ? `${city}, ${where}` : city;
}

export const WORK_MODE: Record<string, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "" };

const SYMBOL: Record<string, string> = { EUR: "€", GBP: "£", USD: "$", CHF: "CHF " };
const PER: Record<string, string> = { year: "a year", month: "a month", day: "a day", hour: "an hour" };

// The range as posted, in its own currency: "€40,000–150,000 a year".
export function salary(
  pay: { min: number; max: number; currency: string; period: string } | null,
): string | null {
  if (!pay) return null;
  const n = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const sym = SYMBOL[pay.currency] ?? `${pay.currency} `;
  const range = pay.min === pay.max ? n(pay.min) : `${n(pay.min)}–${n(pay.max)}`;
  return `${sym}${range} ${PER[pay.period] ?? ""}`.trim();
}

// How long ago a role was posted, in words: "Today", "Yesterday", "3 days ago", "2 weeks ago", "2 years ago".
export function age(date: Date | string, now = Date.now()): string {
  const days = Math.floor((now - new Date(date).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 14) return `${String(days)} days ago`;
  if (days < 60) return `${String(Math.floor(days / 7))} weeks ago`;
  if (days < 730) return `${String(Math.floor(days / 30))} months ago`;
  return `${String(Math.floor(days / 365))} years ago`;
}

// Boards that don't send their company's name have only a slug: "the-exploration-company" → "The Exploration
// Company". Good enough until the name is read from the board.
export const companyName = (name: string | null, slug: string) =>
  name ??
  slug
    .replace(/[-_]+/g, " ")
    .replace(/\d+$/, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
