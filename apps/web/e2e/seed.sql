-- A small, made-up world for the browser tests: one role for each answer the site gives. Applied after the
-- pipeline's migrations (e2e/global-setup.ts); `cli.ts technologies` then reads the postings' technologies.

insert into company (id, ats, slug, name, origin, status) values
  (1, 'ashby', 'fjord-systems', 'Fjord Systems', 'seed', 'active'),
  (2, 'greenhouse', 'northwind', 'Northwind Labs', 'seed', 'active'),
  (3, 'personio', 'tulip', 'Tulip Payments', 'seed', 'active'),
  (4, 'workable', 'kestrel-software', null, 'seed', 'active');

insert into posting (id, company_id, external_id, url, title, family, seniority, location_raw, countries, work_mode,
  remote_scope, posted_at, first_seen_at, last_seen_at, closed_at, content_hash, description, pay) values
  -- Sponsors, and helps you move; the salary clears the Blue Card minimum too
  (1, 1, 'a1', 'https://jobs.example.com/fjord/1', 'Senior Backend Engineer (Go)', 'backend', 'senior',
    'Berlin, Germany', '{DE}', 'onsite', 'country', now() - interval '3 days', now() - interval '3 days', now(), null,
    'h1', E'We build payment rails.\nWe use Go, PostgreSQL and Kubernetes.\nWe sponsor your work visa and help you relocate to Berlin.',
    '{"min": 80000, "max": 95000, "currency": "EUR", "period": "year"}'),
  -- Can sponsor: a licensed UK sponsor, the posting says nothing
  (2, 2, 'b2', 'https://jobs.example.com/northwind/2', 'C++ Engineer', 'software', 'not stated',
    'London, UK', '{GB}', 'hybrid', 'country', now() - interval '10 days', now() - interval '10 days', now(), null,
    'h2', E'Modern C++17 on Linux, for trading systems.', null),
  -- Can sponsor in the UK only, not in Germany
  (3, 2, 'b3', 'https://jobs.example.com/northwind/3', 'Platform Engineer', 'devops', 'not stated',
    'Berlin, Germany; London, UK', '{DE,GB}', 'hybrid', 'country', now() - interval '20 days', now() - interval '20 days',
    now(), null, 'h3', E'Terraform and AWS.', null),
  -- Won't sponsor, Dutch required, and the employer isn't an IND recognised sponsor
  (4, 3, 'c4', 'https://jobs.example.com/tulip/4', 'Frontend Engineer (Vue)', 'frontend', 'not stated',
    'Amsterdam, Netherlands', '{NL}', 'hybrid', 'country', now() - interval '2 days', now() - interval '2 days', now(),
    null, 'h4', E'Vue and TypeScript.\nFluent Dutch is required.\nVisa sponsorship is not available for this role.', null),
  -- Mentions relocation but isn't read yet
  (5, 3, 'c5', 'https://jobs.example.com/tulip/5', 'Data Engineer', 'data', 'not stated',
    'Amsterdam, Netherlands', '{NL}', 'onsite', 'country', now() - interval '1 day', now() - interval '1 day', now(), null,
    'h5', E'Python and Airflow.\nWe offer a relocation package.', null),
  -- Closed
  (6, 1, 'a6', 'https://jobs.example.com/fjord/6', 'Mobile Engineer (Swift)', 'mobile', 'not stated',
    'Berlin, Germany', '{DE}', 'onsite', 'country', now() - interval '40 days', now() - interval '40 days',
    now() - interval '5 days', now() - interval '5 days', 'h6', E'Swift and SwiftUI.\nWe sponsor your work visa.', null),
  -- Unknown: remote in Spain, no register there; posted long ago; the board sends no company name
  (7, 4, 'd7', 'https://jobs.example.com/kestrel/7', 'Staff .NET Developer', 'backend', 'staff',
    'Remote - Spain', '{ES}', 'remote', 'country', now() - interval '400 days', now() - interval '3 days', now(), null,
    'h7', E'C# and .NET 8 on Azure.', null),
  -- Unknown: the salary is under the Blue Card minimum
  (8, 1, 'a8', 'https://jobs.example.com/fjord/8', 'Engineering Manager', 'management', 'manager',
    'Munich, Germany', '{DE}', 'onsite', 'country', now() - interval '6 days', now() - interval '6 days', now(), null,
    'h8', E'Lead a team of five.', '{"min": 40000, "max": 44000, "currency": "EUR", "period": "year"}');

insert into extraction (posting_id, content_hash, prompt_version, requested, model, visa, visa_quote, relocation,
  relocation_quote, created_at) values
  (1, 'h1', 'v1', 'opus', 'claude-opus-5-5', 'offers', 'We sponsor your work visa', 'offers', 'help you relocate to Berlin',
    now() - interval '1 day'),
  (4, 'h4', 'v1', 'opus', 'claude-opus-5-5', 'refuses', 'Visa sponsorship is not available for this role.', 'silent',
    null, now() - interval '1 day'),
  (6, 'h6', 'v1', 'opus', 'claude-opus-5-5', 'offers', 'We sponsor your work visa', 'silent', null,
    now() - interval '6 days');

insert into language_check (posting_id, content_hash, prompt_version, requested, model, languages, quote) values
  (1, 'h1', 'languages-v2', 'sonnet', 'none', '{}', null),
  (2, 'h2', 'languages-v2', 'sonnet', 'none', '{}', null),
  (3, 'h3', 'languages-v2', 'sonnet', 'none', '{}', null),
  (4, 'h4', 'languages-v2', 'sonnet', 'claude-sonnet-5-5', '{dutch}', 'Fluent Dutch is required.'),
  (6, 'h6', 'languages-v2', 'sonnet', 'none', '{}', null),
  (7, 'h7', 'languages-v2', 'sonnet', 'none', '{}', null),
  (8, 'h8', 'languages-v2', 'sonnet', 'none', '{}', null);

insert into register_entry (register, name, core, fetched_at) values
  ('uk_worker', 'NORTHWIND LABS LTD', 'northwind labs', now());

insert into register_review (company_id, register, verdict, entry_name, evidence, reviewed_by) values
  (2, 'uk_worker', 'listed', 'NORTHWIND LABS LTD', 'Made up for the tests.', 'agent'),
  (3, 'nl_ind', 'not_listed', null, 'Made up for the tests.', 'agent');

-- The pipeline's runs, for the status page: everything on time, discovery not recorded yet.
insert into run (kind, started_at, finished_at, stats) values
  ('ingest', now() - interval '2 hours 10 minutes', now() - interval '2 hours', '{"boards": 4, "ok": 4, "failed": 0}'),
  ('registers', now() - interval '5 hours', now() - interval '5 hours', '{"nl_ind": 0, "uk_worker": 1}'),
  ('extract', now() - interval '10 hours', now() - interval '10 hours', '{"postings": 3}');

-- A recruiter's board: the employer, and so the sponsor, may be someone else.
update company set posts_for_others = true where id = 4;

select setval('company_id_seq', 100), setval('posting_id_seq', 100);
