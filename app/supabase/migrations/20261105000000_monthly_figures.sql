-- Monthly figures: what a member earns and spends in a month, stated once (income, rent, food, other, SIPs).
-- EMIs are not here: they come from the member's loans. One row per person per month; the latest month is the current one.

create table public.monthly_figures (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  income bigint not null check (income >= 0),
  rent bigint not null default 0 check (rent >= 0),
  food bigint not null default 0 check (food >= 0),
  other bigint not null default 0 check (other >= 0),
  sips bigint not null default 0 check (sips >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

create trigger monthly_figures_updated before update on public.monthly_figures for each row execute function public.set_updated_at();

alter table public.monthly_figures enable row level security;
create policy monthly_figures_all on public.monthly_figures for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.monthly_figures from anon, authenticated;
grant select, insert, update, delete on public.monthly_figures to authenticated;

-- The export now includes them.
create or replace function public.export_my_data() returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at) from public.consents c where c.user_id = auth.uid()), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.accounts a where a.user_id = auth.uid()), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_on) from public.transactions t where t.user_id = auth.uid()), '[]'::jsonb),
    'monthly_figures', coalesce((select jsonb_agg(to_jsonb(m) order by m.month) from public.monthly_figures m where m.user_id = auth.uid()), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at) from public.goals g where g.user_id = auth.uid()), '[]'::jsonb),
    'tax_inputs', coalesce((select jsonb_agg(to_jsonb(x) order by x.financial_year) from public.tax_inputs x where x.user_id = auth.uid()), '[]'::jsonb),
    'net_worth_snapshots', coalesce((select jsonb_agg(to_jsonb(n) order by n.taken_on) from public.net_worth_snapshots n where n.user_id = auth.uid()), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;
