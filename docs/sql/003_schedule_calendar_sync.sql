begin;

create table if not exists public.schedule_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'ical',
  name text not null,
  ics_url text not null,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references public.schedule_sources(id) on delete cascade,
  external_id text not null,
  title text not null,
  location text,
  notes text,
  shift_date date not null,
  start_time text not null default '',
  end_time text not null default '',
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_schedule_sources_user_url
  on public.schedule_sources (user_id, ics_url);

create unique index if not exists idx_schedule_events_source_external
  on public.schedule_events (source_id, external_id, shift_date, start_time);

create index if not exists idx_schedule_sources_user_created
  on public.schedule_sources (user_id, created_at desc);

create index if not exists idx_schedule_events_user_shift_date
  on public.schedule_events (user_id, shift_date desc);

create index if not exists idx_schedule_events_source_shift_date
  on public.schedule_events (source_id, shift_date desc);

alter table public.schedule_sources enable row level security;
alter table public.schedule_events enable row level security;

drop policy if exists schedule_sources_select_own on public.schedule_sources;
create policy schedule_sources_select_own on public.schedule_sources
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists schedule_sources_insert_own on public.schedule_sources;
create policy schedule_sources_insert_own on public.schedule_sources
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists schedule_sources_update_own on public.schedule_sources;
create policy schedule_sources_update_own on public.schedule_sources
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists schedule_sources_delete_own on public.schedule_sources;
create policy schedule_sources_delete_own on public.schedule_sources
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists schedule_events_select_own on public.schedule_events;
create policy schedule_events_select_own on public.schedule_events
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists schedule_events_insert_own on public.schedule_events;
create policy schedule_events_insert_own on public.schedule_events
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists schedule_events_update_own on public.schedule_events;
create policy schedule_events_update_own on public.schedule_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists schedule_events_delete_own on public.schedule_events;
create policy schedule_events_delete_own on public.schedule_events
  for delete to authenticated
  using (user_id = auth.uid());

commit;
