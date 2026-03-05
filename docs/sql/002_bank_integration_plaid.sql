-- TipTab: Plaid bank integration tables (user-scoped)

begin;

create table if not exists public.bank_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null,
  access_token_encrypted text not null,
  institution_id text,
  institution_name text,
  last_cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plaid_item_id)
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_item_id uuid not null references public.bank_items(id) on delete cascade,
  plaid_account_id text not null,
  name text not null,
  mask text,
  account_type text,
  account_subtype text,
  current_balance numeric(12,2),
  available_balance numeric(12,2),
  iso_currency_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plaid_account_id)
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_item_id uuid not null references public.bank_items(id) on delete cascade,
  bank_account_id uuid references public.bank_accounts(id) on delete set null,
  plaid_transaction_id text not null,
  amount numeric(12,2) not null,
  iso_currency_code text,
  transaction_date date,
  name text,
  merchant_name text,
  category_primary text,
  pending boolean not null default false,
  removed_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plaid_transaction_id)
);

create index if not exists idx_bank_items_user_created on public.bank_items (user_id, created_at desc);
create index if not exists idx_bank_accounts_user_created on public.bank_accounts (user_id, created_at desc);
create index if not exists idx_bank_tx_user_date on public.bank_transactions (user_id, transaction_date desc);

alter table public.bank_items enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;

-- bank_items
drop policy if exists bank_items_select_own on public.bank_items;
create policy bank_items_select_own on public.bank_items
for select to authenticated
using (user_id = auth.uid());

drop policy if exists bank_items_insert_own on public.bank_items;
create policy bank_items_insert_own on public.bank_items
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists bank_items_update_own on public.bank_items;
create policy bank_items_update_own on public.bank_items
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists bank_items_delete_own on public.bank_items;
create policy bank_items_delete_own on public.bank_items
for delete to authenticated
using (user_id = auth.uid());

-- bank_accounts
drop policy if exists bank_accounts_select_own on public.bank_accounts;
create policy bank_accounts_select_own on public.bank_accounts
for select to authenticated
using (user_id = auth.uid());

drop policy if exists bank_accounts_insert_own on public.bank_accounts;
create policy bank_accounts_insert_own on public.bank_accounts
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists bank_accounts_update_own on public.bank_accounts;
create policy bank_accounts_update_own on public.bank_accounts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists bank_accounts_delete_own on public.bank_accounts;
create policy bank_accounts_delete_own on public.bank_accounts
for delete to authenticated
using (user_id = auth.uid());

-- bank_transactions
drop policy if exists bank_transactions_select_own on public.bank_transactions;
create policy bank_transactions_select_own on public.bank_transactions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists bank_transactions_insert_own on public.bank_transactions;
create policy bank_transactions_insert_own on public.bank_transactions
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists bank_transactions_update_own on public.bank_transactions;
create policy bank_transactions_update_own on public.bank_transactions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists bank_transactions_delete_own on public.bank_transactions;
create policy bank_transactions_delete_own on public.bank_transactions
for delete to authenticated
using (user_id = auth.uid());

commit;
