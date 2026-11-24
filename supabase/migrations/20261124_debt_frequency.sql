-- How often each debt's instalments are due, used to move the due date on after a payment.
-- Later, open banking can fill this in from detected payments.
alter table public.debts
  add column if not exists frequency text not null default 'monthly'
  check (frequency in ('weekly', 'fortnightly', 'monthly'));

-- Backfill existing debts with each provider's usual schedule.
update public.debts set frequency = 'fortnightly' where provider in ('Clearpay', 'Zilch');
