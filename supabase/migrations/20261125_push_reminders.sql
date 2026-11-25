-- Payment reminders that arrive even when DERA is closed (Web Push).
-- The private notification key and the job secret live in Supabase Vault
-- (names: vapid_public_key, vapid_private_key, reminders_cron_secret),
-- added separately so they never appear in the code.

create extension if not exists pg_cron;
create extension if not exists pg_net schema extensions;

-- One row per phone or browser that has turned reminders on.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users read their own devices"
  on public.push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users remove their own devices"
  on public.push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Saves this device for the signed-in user. If someone else used to be signed
-- in on the same device, it now belongs to the current user.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- For the send-reminders function only: keys from Vault.
create or replace function public.get_reminder_config()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('vapid_public_key', 'vapid_private_key', 'reminders_cron_secret');
$$;

revoke execute on function public.get_reminder_config() from public, anon, authenticated;
grant execute on function public.get_reminder_config() to service_role;

-- For the send-reminders function only: payments due today or in 3 days (UK time),
-- joined to the devices that should hear about them.
create or replace function public.get_due_reminders()
returns table (
  endpoint text, p256dh text, auth text,
  provider text, item text, total numeric, instalments integer, due_date date, days integer
)
language sql
security definer
set search_path = ''
as $$
  select s.endpoint, s.p256dh, s.auth,
         d.provider, d.item, d.total, d.instalments, d.due_date,
         (d.due_date - (now() at time zone 'Europe/London')::date) as days
  from public.debts d
  join public.push_subscriptions s on s.user_id = d.user_id
  where coalesce(d.paid, 0) < d.instalments
    and d.due_date - (now() at time zone 'Europe/London')::date in (0, 3);
$$;

revoke execute on function public.get_due_reminders() from public, anon, authenticated;
grant execute on function public.get_due_reminders() to service_role;

-- Daily job: runs at 08:00 and 09:00 UTC; the function only sends when it is
-- 9am in the UK, so reminders arrive at 9am in both summer and winter time.
select cron.schedule(
  'send-payment-reminders',
  '0 8,9 * * *',
  $job$
  select net.http_post(
    url := 'https://wvudtxbffgqfbxesmyqz.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);

-- Supabase flagged that the debts rule re-checked the user on every row.
alter policy "Users can manage their own debts" on public.debts
  using ((select auth.uid()) = user_id);
