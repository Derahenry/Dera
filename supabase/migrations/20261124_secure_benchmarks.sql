-- Benchmarks: compute anonymous per-user totals from real debts on the server,
-- instead of trusting numbers the browser inserts.
create or replace function public.get_benchmark_totals()
returns table (total_debt numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select sum(d.total) as total_debt
  from public.debts d
  group by d.user_id
$$;

revoke execute on function public.get_benchmark_totals() from public, anon;
grant execute on function public.get_benchmark_totals() to authenticated;

-- The old client-written table is no longer used by the app; close it off.
-- (Existing rows are kept; the table can be dropped later.)
drop policy if exists "Anyone can insert benchmarks" on public.benchmarks;
drop policy if exists "Anyone can read benchmarks" on public.benchmarks;

-- rls_auto_enable is an event-trigger function; it never needs to be callable over the API.
-- Event triggers still fire without EXECUTE grants.
-- (Guarded so a fresh project without this function can still run the file.)
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
