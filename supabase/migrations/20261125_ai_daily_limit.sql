-- A daily cap on AI requests per person, so one account can't use up the
-- Groq allowance. Counts are per UK day; nobody can read or edit the table
-- directly, only through use_ai_request().
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Counts one request for the signed-in user. Returns how many are left today,
-- or -1 if they were already at the limit (and doesn't count it).
create or replace function public.use_ai_request(daily_limit integer default 30)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/London')::date;
  used integer;
begin
  if uid is null then
    return -1;
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1
    where public.ai_usage.count < daily_limit
  returning count into used;

  if used is null then
    return -1;
  end if;
  return daily_limit - used;
end;
$$;

revoke execute on function public.use_ai_request(integer) from public, anon;
grant execute on function public.use_ai_request(integer) to authenticated;
