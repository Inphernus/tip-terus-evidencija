-- Tip-Terus evidencija radnog vremena — shema baze
-- Pokrenuti jednom u Supabase → SQL Editor (nova baza; već postojeća baza: pokrenuti datoteke iz migrations/).
-- Sve izmjene podataka idu preko servera (secret key); RLS dopušta samo čitanje.

-- ---------- Tipovi ----------
create type user_role as enum ('admin', 'employee');
create type absence_type as enum ('godisnji', 'bolovanje', 'blagdan');

-- ---------- Djelatnici ----------
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  first_name  text not null,
  last_name   text not null,
  email       text not null unique,
  role        user_role not null default 'employee',
  active      boolean not null default true,  -- "uklonjen" djelatnik = active false, povijest ostaje
  created_at  timestamptz not null default now()
);

-- ---------- Dolasci / odlasci ----------
create table time_entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles on delete cascade,
  work_date   date not null,                  -- dan po zoni Europe/Zagreb
  start_at    timestamptz not null,
  end_at      timestamptz,                    -- null = dan nije zatvoren
  note        text,                           -- Jurin opis izmjene (vidljiv i djelatniku)
  edited_by   uuid references profiles,
  edited_at   timestamptz,
  created_at  timestamptz not null default now(),
  constraint end_after_start check (end_at is null or end_at > start_at)
);
create index time_entries_user_date on time_entries (user_id, work_date);

-- ---------- Godišnji / bolovanje / plaćeni blagdan (8 h, posebne kategorije) ----------
create table absences (
  user_id     uuid not null references profiles on delete cascade,
  date        date not null,
  type        absence_type not null,
  note        text,
  created_by  uuid references profiles,
  created_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- ---------- Blagdani ----------
create table holidays (
  date  date primary key,
  name  text not null
);

-- ---------- Povijest Jurinih izmjena ----------
create table audit_log (
  id          bigint generated always as identity primary key,
  changed_by  uuid references profiles,
  user_id     uuid references profiles on delete cascade,  -- čiji je zapis mijenjan
  action      text not null,
  old_data    jsonb,
  new_data    jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- RLS ----------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active);
$$;

alter table profiles     enable row level security;
alter table time_entries enable row level security;
alter table absences     enable row level security;
alter table holidays     enable row level security;
alter table audit_log    enable row level security;

create policy "vlastiti ili admin" on profiles     for select using (id = auth.uid() or is_admin());
create policy "vlastiti ili admin" on time_entries for select using (user_id = auth.uid() or is_admin());
create policy "vlastiti ili admin" on absences     for select using (user_id = auth.uid() or is_admin());
create policy "svi prijavljeni"    on holidays     for select to authenticated using (true);
create policy "samo admin"         on audit_log    for select using (is_admin());

-- ---------- Blagdani RH 2026–2027 ----------
insert into holidays (date, name) values
  ('2026-01-01', 'Nova godina'),
  ('2026-01-06', 'Sveta tri kralja'),
  ('2026-04-05', 'Uskrs'),
  ('2026-04-06', 'Uskrsni ponedjeljak'),
  ('2026-05-01', 'Praznik rada'),
  ('2026-05-30', 'Dan državnosti'),
  ('2026-06-04', 'Tijelovo'),
  ('2026-06-22', 'Dan antifašističke borbe'),
  ('2026-08-05', 'Dan pobjede i domovinske zahvalnosti'),
  ('2026-08-15', 'Velika Gospa'),
  ('2026-11-01', 'Svi sveti'),
  ('2026-11-18', 'Dan sjećanja na žrtve Domovinskog rata'),
  ('2026-12-25', 'Božić'),
  ('2026-12-26', 'Sveti Stjepan'),
  ('2027-01-01', 'Nova godina'),
  ('2027-01-06', 'Sveta tri kralja'),
  ('2027-03-28', 'Uskrs'),
  ('2027-03-29', 'Uskrsni ponedjeljak'),
  ('2027-05-01', 'Praznik rada'),
  ('2027-05-27', 'Tijelovo'),
  ('2027-05-30', 'Dan državnosti'),
  ('2027-06-22', 'Dan antifašističke borbe'),
  ('2027-08-05', 'Dan pobjede i domovinske zahvalnosti'),
  ('2027-08-15', 'Velika Gospa'),
  ('2027-11-01', 'Svi sveti'),
  ('2027-11-18', 'Dan sjećanja na žrtve Domovinskog rata'),
  ('2027-12-25', 'Božić'),
  ('2027-12-26', 'Sveti Stjepan');
