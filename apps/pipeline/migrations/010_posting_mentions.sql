-- Whether each posting mentions visas, relocation, permits or the right to work (mentions_visa, migration 009), kept
-- with the posting so counting them doesn't run the pattern over every text. Postgres recomputes it when a row
-- changes; a new pattern needs this column dropped and added again, in the same migration as the new function.
alter table posting add column mentions boolean generated always as (mentions_visa(description)) stored;
