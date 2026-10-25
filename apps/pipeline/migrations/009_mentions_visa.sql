-- Whether a posting mentions visas, relocation, permits or the right to work: the postings the nightly extraction
-- reads (MENTIONS_RE in src/signals.ts; a test keeps the two the same). The site tells "the posting says nothing"
-- from "not read yet" with it.
create function mentions_visa(text) returns boolean language sql immutable parallel safe
return $1 ~* '(visa|sponsor|relocat|permit|blue card|right to work|eligible to work|authori[sz]ed to work|work authori[sz]ation|immigra|citizen|global mobility|kennismigrant|residence|aufenthalt|arbeitserlaubnis|umzug|werkvergunning|verblijfsvergunning|verhuiz|permis de travail|titre de s[ée]jour|d[ée]m[ée]nagement|permiso de trabajo|reubicaci|permesso di|pozwoleni[ea] na prac|relokacj|autoriza[çc][ãa]o de|työlupa|työskentelylupa|oleskelulupa|arbetstillst[åa]nd|uppehållstillst[åa]nd|arbejdstilladelse|opholdstilladelse)';
