-- Run this once in the Supabase SQL editor.

create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invited_to_welcome boolean not null default true,
  notes text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references parties (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  is_plus_one boolean not null default false,
  attending boolean,
  attending_welcome boolean,
  meal text check (meal in ('beef', 'fish', 'vegetarian')),
  dietary text,
  updated_at timestamptz
);

create index if not exists guests_party_id_idx on guests (party_id);
create index if not exists guests_name_idx on guests (lower(first_name), lower(last_name));

-- The site talks to the DB only through server routes using the service-role
-- key, which bypasses RLS. Enabling RLS with no policies blocks the anon key.
alter table parties enable row level security;
alter table guests enable row level security;

-- One flat row per guest: easy to read in the Table Editor or export to CSV.
-- security_invoker makes the view respect RLS instead of running as its owner.
create or replace view rsvp_summary with (security_invoker = true) as
select
  p.name as party,
  g.first_name,
  g.last_name,
  g.is_plus_one,
  case when g.attending is null then 'pending'
       when g.attending then 'yes' else 'no' end as attending,
  case when not p.invited_to_welcome then 'not invited'
       when g.attending_welcome is null then 'pending'
       when g.attending_welcome then 'yes' else 'no' end as welcome_drinks,
  g.meal,
  g.dietary,
  p.responded_at
from guests g
join parties p on p.id = g.party_id
order by p.name, g.is_plus_one, g.last_name, g.first_name;

-- Only the server (service_role) may touch these. Explicit so it works whether
-- or not "Automatically expose new tables" is enabled in the project.
revoke all on parties, guests, rsvp_summary from anon, authenticated;
grant select, insert, update, delete on parties, guests to service_role;
grant select on rsvp_summary to service_role;

-- Example data (delete once you import your real list):
-- with p as (insert into parties (name) values ('Test Family') returning id)
-- insert into guests (party_id, first_name, last_name, is_plus_one)
-- select id, x.f, x.l, x.plus from p,
--   (values ('Test', 'Guest', false), ('', '', true)) as x(f, l, plus);
