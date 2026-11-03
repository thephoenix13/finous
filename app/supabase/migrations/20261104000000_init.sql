-- Finous: first schema. Every table that holds a person's data is owned by a user (user_id) and locked to that user
-- with row level security. Money is a whole number of rupees (bigint), as in the app's data contract.
-- Apply in the Supabase SQL editor or with `supabase db push`. See supabase/README.md.

-- ── Profiles ────────────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  full_name text,
  city text,
  language text not null default 'en' check (language in ('en', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── App consents (beta trial, privacy notice). Not Account Aggregator consents. Append-only. ────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('beta-trial', 'privacy-notice')),
  version text not null check (length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  unique (user_id, kind, version)
);

-- ── Accounts the user holds. `details` carries what is particular to the kind (last4, balance, rate, ...). ──
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bank', 'loan', 'card', 'investment', 'other')),
  name text not null check (length(name) between 1 and 120),
  details jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (source in ('manual', 'aa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_idx on public.accounts (user_id);

-- ── Transactions the user records (or, later, that arrive from Account Aggregator). ─────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete cascade,
  occurred_on date not null,
  occurred_at time,
  description text not null check (length(description) between 1 and 200),
  amount bigint not null check (amount <> 0),
  category text not null default 'other' check (category in ('emi', 'sip', 'rent', 'food', 'income', 'other')),
  source text not null default 'manual' check (source in ('manual', 'aa')),
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);

-- ── Goals. ──────────────────────────────────────────────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  target_amount bigint not null check (target_amount > 0),
  funded_amount bigint not null default 0 check (funded_amount >= 0),
  target_date date not null,
  assumed_return_percent numeric(5, 2) not null default 0 check (assumed_return_percent between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id);

-- ── Tax inputs the user states for a financial year (what Account Aggregator will not tell us). ──
create table public.tax_inputs (
  user_id uuid not null references auth.users (id) on delete cascade,
  financial_year text not null check (financial_year ~ '^\d{4}-\d{2}$'),
  inputs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, financial_year)
);

-- ── One net-worth reading a day, so the history line is the user's own. ─────────────────────────
create table public.net_worth_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_on date not null,
  value bigint not null,
  primary key (user_id, taken_on)
);

-- ── Market rates: reference data, not a person's. Everyone signed in may read; only the service role writes. ──
create table public.market_rates (
  key text primary key check (key ~ '^[a-z0-9-]+$'),
  value numeric(6, 3) not null check (value >= 0),
  as_of date not null,
  source text not null,
  fetched_at timestamptz not null default now()
);

-- ── Keep updated_at honest. ─────────────────────────────────────────────────────────────────────
create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger accounts_updated before update on public.accounts for each row execute function public.set_updated_at();
create trigger goals_updated before update on public.goals for each row execute function public.set_updated_at();
create trigger tax_inputs_updated before update on public.tax_inputs for each row execute function public.set_updated_at();

-- ── A profile row appears when someone signs up. ────────────────────────────────────────────────
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ── Row level security: each person sees and changes only their own rows. ───────────────────────
alter table public.profiles enable row level security;
alter table public.consents enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.tax_inputs enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.market_rates enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Consents can be recorded and read, never edited or removed by the user.
create policy consents_select on public.consents for select to authenticated using (user_id = auth.uid());
create policy consents_insert on public.consents for insert to authenticated with check (user_id = auth.uid());

create policy accounts_all on public.accounts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy goals_all on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tax_inputs_all on public.tax_inputs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy snapshots_all on public.net_worth_snapshots for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A transaction may only point at an account the same person owns.
create policy transactions_all on public.transactions for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (account_id is null or exists (select 1 from public.accounts a where a.id = account_id and a.user_id = auth.uid()))
  );

create policy market_rates_select on public.market_rates for select to authenticated using (true);

-- ── Privileges: nobody anonymous touches anything; signed-in people get only what the policies allow. ──
revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert on public.consents to authenticated;
grant select, insert, update, delete on public.accounts, public.transactions, public.goals, public.tax_inputs, public.net_worth_snapshots to authenticated;
grant select on public.market_rates to authenticated;

-- ── Your data, your call (DPDP Act): export everything, or delete the account and all of it. ────
create function public.export_my_data() returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at) from public.consents c where c.user_id = auth.uid()), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.accounts a where a.user_id = auth.uid()), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_on) from public.transactions t where t.user_id = auth.uid()), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at) from public.goals g where g.user_id = auth.uid()), '[]'::jsonb),
    'tax_inputs', coalesce((select jsonb_agg(to_jsonb(x) order by x.financial_year) from public.tax_inputs x where x.user_id = auth.uid()), '[]'::jsonb),
    'net_worth_snapshots', coalesce((select jsonb_agg(to_jsonb(n) order by n.taken_on) from public.net_worth_snapshots n where n.user_id = auth.uid()), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;

create function public.delete_my_account() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.export_my_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
