-- Boards that post roles for other companies (staffing agencies, recruiters, a fund's portfolio board): the site
-- says the employer, and so the sponsor, may be someone else. Set by reviews (reviews/companies.jsonl).
alter table company add column posts_for_others boolean not null default false;
