-- Baseline: the tables DERA started with, before the later migrations.
-- These were created in the Supabase dashboard and already exist in production;
-- this file lets a fresh project be set up by running every migration in order.

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  provider text not null,
  item text not null,
  total numeric not null,
  instalments integer not null,
  paid integer default 0,
  due_date date not null,
  status text default 'on-track',
  created_at timestamp default now()
);

alter table public.debts enable row level security;

create policy "Users can manage their own debts"
  on public.debts for all
  using (auth.uid() = user_id);

-- Legacy: anonymous totals the browser used to write. The app now uses
-- get_benchmark_totals() instead (see 20261124_secure_benchmarks.sql).
create table if not exists public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  total_debt numeric not null,
  debt_count integer not null,
  created_at timestamptz default now()
);

alter table public.benchmarks enable row level security;
