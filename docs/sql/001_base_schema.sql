begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text,
  timezone text default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null,
  venue text,
  cash_tips numeric(10,2) not null default 0,
  card_tips numeric(10,2) not null default 0,
  hourly_wages numeric(10,2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null,
  category text not null,
  amount numeric(10,2) not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_income_entries_user_shift_date
  on public.income_entries (user_id, shift_date desc);

create index if not exists idx_expense_entries_user_expense_date
  on public.expense_entries (user_id, expense_date desc);

alter table public.profiles enable row level security;
alter table public.income_entries enable row level security;
alter table public.expense_entries enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists income_entries_select_own on public.income_entries;
create policy income_entries_select_own on public.income_entries for select to authenticated using (user_id = auth.uid());

drop policy if exists income_entries_insert_own on public.income_entries;
create policy income_entries_insert_own on public.income_entries for insert to authenticated with check (user_id = auth.uid());

drop policy if exists income_entries_update_own on public.income_entries;
create policy income_entries_update_own on public.income_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists income_entries_delete_own on public.income_entries;
create policy income_entries_delete_own on public.income_entries for delete to authenticated using (user_id = auth.uid());

drop policy if exists expense_entries_select_own on public.expense_entries;
create policy expense_entries_select_own on public.expense_entries for select to authenticated using (user_id = auth.uid());

drop policy if exists expense_entries_insert_own on public.expense_entries;
create policy expense_entries_insert_own on public.expense_entries for insert to authenticated with check (user_id = auth.uid());

drop policy if exists expense_entries_update_own on public.expense_entries;
create policy expense_entries_update_own on public.expense_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists expense_entries_delete_own on public.expense_entries;
create policy expense_entries_delete_own on public.expense_entries for delete to authenticated using (user_id = auth.uid());

commit;
