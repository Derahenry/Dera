-- Purchases DERA has detected (from a pasted email today, forwarded emails or a
-- bank later) that wait for the user to add, edit or ignore them.
-- Only the extracted details are stored, never the email itself.
create table if not exists public.pending_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null default 'email_paste'
    check (source in ('email_paste', 'email_forward', 'bank')),
  provider text,
  item text,
  total numeric,
  instalments integer,
  paid integer,
  due_date date,
  frequency text,
  status text not null default 'pending'
    check (status in ('pending', 'added', 'ignored')),
  debt_id uuid references public.debts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pending_purchases_user_status_idx
  on public.pending_purchases (user_id, status);
create index if not exists pending_purchases_debt_id_idx
  on public.pending_purchases (debt_id);
create index if not exists debts_user_id_idx
  on public.debts (user_id);

alter table public.pending_purchases enable row level security;

create policy "Users read their own detected purchases"
  on public.pending_purchases for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add their own detected purchases"
  on public.pending_purchases for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own detected purchases"
  on public.pending_purchases for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own detected purchases"
  on public.pending_purchases for delete to authenticated
  using ((select auth.uid()) = user_id);

-- New detections appear in the app live.
alter publication supabase_realtime add table public.pending_purchases;

-- Deleting an account also deletes its debts (it was blocked before).
alter table public.debts drop constraint if exists debts_user_id_fkey;
alter table public.debts
  add constraint debts_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
