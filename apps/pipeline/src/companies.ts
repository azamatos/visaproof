import { readFileSync } from "node:fs";
import { sql } from "./db.ts";

// Reviewed company names for boards that don't send one (reviews/companies.jsonl): the name a company uses for
// itself, with evidence, and whether the board posts roles for other companies. A board's own name always wins:
// a reviewed name only fills a gap. The file is the whole truth: a reviewed name it changes or drops changes or
// goes on the next load. A file with any bad line loads nothing.

type NameReview = {
  company_id: number;
  board: string;
  name: string | null;
  evidence: string;
  confidence: "high" | "medium" | "low";
  posts_for_others: boolean;
};

export async function loadNames(file: string) {
  const reviews = readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as NameReview);
  const boards = new Map(
    (
      await sql<{ id: number; board: string; name: string | null; name_reviewed: boolean }[]>`
        select id, ats || ':' || slug as board, name, name_reviewed from company
        where id in ${sql(reviews.map((r) => r.company_id))}`
    ).map((c) => [c.id, c]),
  );
  const problems: string[] = [];
  for (const r of reviews) {
    const at = `company ${String(r.company_id)}`;
    const c = boards.get(r.company_id);
    if (!c) problems.push(`${at}: no such company`);
    else if (c.board !== r.board) problems.push(`${at}: is ${c.board}, not ${r.board}`);
    if (!r.evidence.trim()) problems.push(`${at}: no evidence`);
    if (r.name !== null && !r.name.trim()) problems.push(`${at}: empty name`);
  }
  if (problems.length) throw new Error(`names not loaded:\n${problems.join("\n")}`);

  let named = 0;
  const kept: string[] = [];
  const ids = reviews.map((r) => r.company_id);
  await sql.begin(async (tx) => {
    for (const r of reviews) {
      const c = boards.get(r.company_id);
      const own = c && !c.name_reviewed ? c.name : null;
      // Low confidence names stay unnamed: a slug title-cased is no worse than a guess.
      if (r.name && r.confidence !== "low") {
        if (own && own !== r.name) kept.push(`${r.board}: the board says "${own}", the review "${r.name}"`);
        else if (!own) {
          await tx`update company set name = ${r.name.trim()}, name_reviewed = true where id = ${r.company_id}`;
          named++;
        }
      } else if (c?.name_reviewed)
        await tx`update company set name = null, name_reviewed = false where id = ${r.company_id}`;
      await tx`update company set posts_for_others = ${r.posts_for_others} where id = ${r.company_id}`;
    }
    // Reviews taken out of the file.
    await tx`update company set name = null, name_reviewed = false where name_reviewed and id not in ${tx(ids)}`;
    await tx`update company set posts_for_others = false where posts_for_others and id not in ${tx(ids)}`;
  });
  const others = reviews.filter((r) => r.posts_for_others).length;
  console.log(
    `names: ${String(named)} of ${String(reviews.length)} named, ${String(others)} post for others`,
  );
  if (kept.length) console.log(`kept the board's own name:\n  ${kept.join("\n  ")}`);
}
