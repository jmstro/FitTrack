-- Momentum (Supabase) schema + security (v2)
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

-- Profiles (public handle + display name)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists goal text,
  add column if not exists frequency text,
  add column if not exists today_focus text,
  add column if not exists age int,
  add column if not exists gender text,
  add column if not exists height_cm numeric,
  add column if not exists starting_weight_lb numeric,
  add column if not exists units text not null default 'lb',
  add column if not exists theme text not null default 'auto',
  add column if not exists prefers_morning boolean not null default false,
  add column if not exists onboarded boolean not null default false,
  add column if not exists insight_intensity text not null default 'strict',
  add column if not exists tour_completed boolean not null default false;

-- Workout logs (multi-session)
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  started_at timestamptz not null default now(),
  name text not null,
  exercises jsonb not null,
  split_type text,
  primary_muscles text[],
  secondary_muscles text[],
  total_volume numeric not null default 0,
  total_sets int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_logs
  add column if not exists split_type text,
  add column if not exists primary_muscles text[],
  add column if not exists secondary_muscles text[],
  add column if not exists started_at timestamptz not null default now();

alter table public.workout_logs
  drop constraint if exists workout_logs_user_id_log_date_key;

create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, log_date);
create index if not exists workout_logs_user_date_started_idx on public.workout_logs (user_id, log_date, started_at desc);

-- Weight logs
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_lb numeric,
  note text,
  is_morning boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, log_date);

-- Workout templates
create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exercises jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  is_private boolean not null default true,
  challenge_type text not null default 'workouts',
  challenge_goal int not null default 4,
  created_at timestamptz not null default now()
);

create index if not exists groups_owner_idx on public.groups (owner_id);

-- Group members
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists group_members_group_idx on public.group_members (group_id);

create or replace function public.is_group_member(target_group uuid, member_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group
      and gm.user_id = member_id
  );
$$;

create or replace function public.is_group_owner(target_group uuid, owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group
      and g.owner_id = owner_id
  );
$$;

create or replace function public.has_shared_group(target_user uuid, viewer_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.group_members gm_target
    join public.group_members gm_viewer
      on gm_target.group_id = gm_viewer.group_id
    where gm_target.user_id = target_user
      and gm_viewer.user_id = viewer_id
  );
$$;

-- Group feed
create table if not exists public.group_feed (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists group_feed_group_created_idx on public.group_feed (group_id, created_at desc);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists workout_logs_set_updated_at on public.workout_logs;
create trigger workout_logs_set_updated_at
before update on public.workout_logs
for each row execute function public.set_updated_at();

drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at
before update on public.workout_templates
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.workout_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.workout_templates enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_feed enable row level security;

-- profiles
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
on public.profiles for select
using (auth.uid() = id);

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'public_profiles'
  ) then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'public_profiles'
        and c.relkind = 'v'
    ) then
      execute 'drop view public.public_profiles';
    else
      execute 'drop table public.public_profiles';
    end if;
  end if;
end $$;

create table if not exists public.public_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

drop policy if exists "public_profiles_read" on public.public_profiles;
create policy "public_profiles_read"
on public.public_profiles for select
using (
  auth.uid() = id
  or is_public = true
  or public.has_shared_group(id, auth.uid())
);

grant select on public.public_profiles to authenticated;

create or replace function public.sync_public_profile()
returns trigger language plpgsql as $$
begin
  insert into public.public_profiles (id, username, display_name, is_public, updated_at)
  values (new.id, new.username, new.display_name, new.is_public, now())
  on conflict (id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    is_public = excluded.is_public,
    updated_at = now();
  return new;
end; $$;

drop trigger if exists profiles_public_profiles_sync on public.profiles;
create trigger profiles_public_profiles_sync
after insert or update on public.profiles
for each row execute function public.sync_public_profile();

insert into public.public_profiles (id, username, display_name, is_public, updated_at)
select id, username, display_name, is_public, now()
from public.profiles
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  is_public = excluded.is_public,
  updated_at = now();

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- workout logs
drop policy if exists "workout_logs_self_read" on public.workout_logs;
create policy "workout_logs_self_read"
on public.workout_logs for select
using (auth.uid() = user_id);

drop policy if exists "workout_logs_self_write" on public.workout_logs;
create policy "workout_logs_self_write"
on public.workout_logs for insert
with check (auth.uid() = user_id);

drop policy if exists "workout_logs_self_update" on public.workout_logs;
create policy "workout_logs_self_update"
on public.workout_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "workout_logs_self_delete" on public.workout_logs;
create policy "workout_logs_self_delete"
on public.workout_logs for delete
using (auth.uid() = user_id);

-- weight logs
drop policy if exists "weight_logs_self_read" on public.weight_logs;
create policy "weight_logs_self_read"
on public.weight_logs for select
using (auth.uid() = user_id);

drop policy if exists "weight_logs_self_write" on public.weight_logs;
create policy "weight_logs_self_write"
on public.weight_logs for insert
with check (auth.uid() = user_id);

drop policy if exists "weight_logs_self_update" on public.weight_logs;
create policy "weight_logs_self_update"
on public.weight_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "weight_logs_self_delete" on public.weight_logs;
create policy "weight_logs_self_delete"
on public.weight_logs for delete
using (auth.uid() = user_id);

-- workout templates
drop policy if exists "templates_self_read" on public.workout_templates;
create policy "templates_self_read"
on public.workout_templates for select
using (auth.uid() = user_id);

drop policy if exists "templates_self_write" on public.workout_templates;
create policy "templates_self_write"
on public.workout_templates for insert
with check (auth.uid() = user_id);

drop policy if exists "templates_self_update" on public.workout_templates;
create policy "templates_self_update"
on public.workout_templates for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "templates_self_delete" on public.workout_templates;
create policy "templates_self_delete"
on public.workout_templates for delete
using (auth.uid() = user_id);

-- groups
drop policy if exists "groups_member_read" on public.groups;
create policy "groups_member_read"
on public.groups for select
using (
  auth.uid() = owner_id
  or public.is_group_member(id, auth.uid())
);

drop policy if exists "groups_owner_write" on public.groups;
create policy "groups_owner_write"
on public.groups for insert
with check (auth.uid() = owner_id);

drop policy if exists "groups_owner_update" on public.groups;
create policy "groups_owner_update"
on public.groups for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "groups_owner_delete" on public.groups;
create policy "groups_owner_delete"
on public.groups for delete
using (auth.uid() = owner_id);

-- group members
drop policy if exists "group_members_read" on public.group_members;
create policy "group_members_read"
on public.group_members for select
using (
  public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "group_members_owner_insert" on public.group_members;
create policy "group_members_owner_insert"
on public.group_members for insert
with check (
  public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "group_members_owner_delete" on public.group_members;
create policy "group_members_owner_delete"
on public.group_members for delete
using (
  public.is_group_owner(group_id, auth.uid())
  or auth.uid() = user_id
);

-- group feed
drop policy if exists "group_feed_read" on public.group_feed;
create policy "group_feed_read"
on public.group_feed for select
using (
  public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
);

drop policy if exists "group_feed_write" on public.group_feed;
create policy "group_feed_write"
on public.group_feed for insert
with check (
  public.is_group_member(group_id, auth.uid())
  or public.is_group_owner(group_id, auth.uid())
);
