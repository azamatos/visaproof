-- "Can sponsor" per country: a role in Germany and the UK whose employer is only on the UK register can sponsor in
-- the UK, not in Germany. can_in lists the countries where the law lets this employer hire on a visa, so search can
-- answer for the countries a visitor filters on. Columns are added, none change.
drop view role_answer;

-- One answer per role, as the site shows it: the visa state (the five in docs/design-brief.md), relocation and
-- languages, each with its evidence. The posting's own words come first. For a posting that says nothing, the law:
-- a reviewed register entry still on the register (UK, Netherlands), or a posted salary at or over the reduced Blue
-- Card minimum (Germany; software roles fall under it). Extractions count for the posting's current text and the
-- prompts in use (extract-v1 with Opus, languages-v2 with Sonnet): a new prompt means a new version of this view.
create view role_answer as
with fact as (
  select distinct on (e.posting_id) e.posting_id, e.visa, e.visa_quote, e.relocation, e.relocation_quote,
    e.created_at as read_at
  from extraction e join posting p on p.id = e.posting_id and p.content_hash = e.content_hash
  where e.prompt_version = 'v1' and e.requested = 'opus'
  order by e.posting_id, e.created_at desc
), lang as (
  select distinct on (l.posting_id) l.posting_id, l.languages, l.quote, l.written_in, l.created_at as read_at
  from language_check l join posting p on p.id = l.posting_id and p.content_hash = l.content_hash
  where l.prompt_version = 'languages-v2' and l.requested = 'sonnet'
  order by l.posting_id, l.created_at desc
), review as (
  select r.*, r.verdict = 'listed'
    and exists (select 1 from register_entry x where x.register = r.register and x.name = r.entry_name) as listed
  from register_review r
), blue as (
  select amount from visa_rule
  where country = 'DE' and rule = 'blue_card_reduced' and applies_from <= current_date
  order by applies_from desc limit 1
), role as (
  select p.id, p.company_id, p.countries, p.last_seen_at,
    fact.visa as said, fact.visa_quote, fact.relocation, fact.relocation_quote, fact.read_at,
    lang.languages, lang.quote as language_quote, lang.written_in, lang.read_at as languages_read_at,
    uk.verdict as uk_verdict, uk.entry_name as uk_entry, uk.reviewed_at as uk_reviewed_at,
    nl.verdict as nl_verdict, nl.entry_name as nl_entry, nl.reviewed_at as nl_reviewed_at,
    'GB' = any(p.countries) and coalesce(uk.listed, false) as can_uk,
    'NL' = any(p.countries) and coalesce(nl.listed, false) as can_nl,
    coalesce('DE' = any(p.countries) and p.pay ->> 'currency' = 'EUR'
      and case p.pay ->> 'period'
        when 'year' then (p.pay ->> 'min')::numeric
        when 'month' then (p.pay ->> 'min')::numeric * 12
      end >= (select amount from blue), false) as can_de,
    (select amount from blue) as blue_card_minimum
  from posting p
  left join fact on fact.posting_id = p.id
  left join lang on lang.posting_id = p.id
  left join review uk on uk.company_id = p.company_id and uk.register = 'uk_worker'
  left join review nl on nl.company_id = p.company_id and nl.register = 'nl_ind'
), checked as (
  select role.*, array_remove(array[
    case when role.can_uk then 'GB' end, case when role.can_nl then 'NL' end, case when role.can_de then 'DE' end
  ], null) as can_in
  from role
)
select x.id as posting_id, x.company_id,
  case x.said
    when 'offers' then 'sponsors'
    when 'maybe' then 'may'
    when 'refuses' then 'wont'
    else case when x.can_in <> '{}' then 'can' else 'unknown' end
  end as visa,
  -- strongest first, as search sorts by default
  case x.said
    when 'offers' then 1
    when 'maybe' then 2
    when 'refuses' then 5
    else case when x.can_in <> '{}' then 3 else 4 end
  end as visa_rank,
  x.visa_quote, x.read_at,
  x.can_uk, x.can_nl, x.can_de, x.can_in, x.blue_card_minimum,
  x.uk_verdict, x.uk_entry, x.uk_reviewed_at, x.nl_verdict, x.nl_entry, x.nl_reviewed_at,
  case x.relocation when 'offers' then 'helps' when 'maybe' then 'may' when 'refuses' then 'no' else 'silent' end
    as relocation,
  x.relocation_quote,
  x.languages, x.language_quote, x.written_in, x.languages_read_at
from checked x;
