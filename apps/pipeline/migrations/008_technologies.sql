-- The technologies each posting names (src/technologies.ts), for search: keys such as 'go', 'cpp' and 'dotnet', with
-- the dictionary version that read them, so a new dictionary reads them again (cli.ts technologies).
alter table posting add column technologies text[], add column technologies_version text;
create index posting_technologies on posting using gin (technologies);

-- The dictionary, for the site: each technology's label and every name it can be searched by, in lower case.
create table technology (
  key text primary key,
  label text not null,
  search text[] not null
);
