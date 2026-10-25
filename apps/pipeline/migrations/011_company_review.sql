-- Boards that post roles for other companies (staffing agencies, recruiters, a fund's portfolio board): the site
-- says the employer, and so the sponsor, may be someone else. Set by reviews (reviews/companies.jsonl).
alter table company add column posts_for_others boolean not null default false;

-- Whether company.name came from a review rather than from the board: a reviewed name can be corrected or removed
-- by the next load, and gives way when the board starts sending its own.
alter table company add column name_reviewed boolean not null default false;
