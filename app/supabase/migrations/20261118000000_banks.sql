-- Banks. A bank is a row. A customer reaches it through its address, joins it, and chooses whether it can see the accounts it supplied.
-- Bank staff never read customer tables: they call the staff_* functions below, which return only customers who are sharing right now
-- and write every call to bank_access_log. Nothing here changes what existing members see: no bank exists until Finous adds one.
-- Apply in the Supabase SQL editor or with `supabase db push`. See supabase/README.md.

-- ── Banks. Written only by Finous (the service role). Customers and staff read branding through bank_public(). ──
create table public.banks (
  id uuid primary key default gen_random_uuid(),
  subdomain text not null unique check (
    subdomain ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
    and not (subdomain = any (array['www', 'app', 'api', 'admin', 'console', 'business', 'mail', 'support', 'help', 'status', 'finous', 'demo', 'staging', 'test']))
  ),
  name text not null check (length(name) between 2 and 60),
  install_name text not null check (length(install_name) between 2 and 30),
  -- A small image as a data URL. Shown only as an image, never placed into the page.
  logo text check (logo is null or (length(logo) <= 700000 and logo ~ '^data:image/(png|jpeg|svg\+xml);base64,')),
  brand_colour text not null check (brand_colour ~ '^#[0-9A-F]{6}$'),
  on_brand_colour text not null check (on_brand_colour ~ '^#[0-9A-F]{6}$'),
  disclaimer text not null check (length(disclaimer) between 10 and 400),
  english boolean not null default true,
  hindi boolean not null default true,
  advisor text not null default 'rules' check (advisor in ('off', 'rules', 'ai')),
  -- Only a live bank is shown to customers or can have staff read anything.
  status text not null default 'draft' check (status in ('draft', 'live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (english or hindi)
);
create trigger banks_updated before update on public.banks for each row execute function public.set_updated_at();

-- ── Which banks a person has joined. The reference is how staff see them: never an id, never an email. ──
create sequence public.bank_member_ref_seq start 1001;
create table public.bank_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_id uuid not null references public.banks (id) on delete restrict,
  ref text not null unique default ('C-' || nextval('public.bank_member_ref_seq')::text),
  joined_at timestamptz not null default now(),
  primary key (user_id, bank_id)
);

-- ── Sharing with a bank. Append-only: a change is a new row, and the latest row is the current choice. ──
create table public.bank_sharing_events (
  seq bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_id uuid not null references public.banks (id) on delete restrict,
  sharing boolean not null,
  at timestamptz not null default now()
);
create index bank_sharing_events_latest_idx on public.bank_sharing_events (bank_id, user_id, at desc, seq desc);

-- ── A bank's staff: an ordinary account marked as staff of one bank, with a role. Added by Finous. ──
create table public.bank_staff (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.banks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'compliance', 'marketing', 'branch', 'readonly')),
  -- A branch member sees only their own branch. With no branch they see nothing, never everything.
  branch text,
  created_at timestamptz not null default now(),
  unique (bank_id, user_id),
  check (role <> 'branch' or branch is not null)
);

-- ── Who looked at whom. Written only by the staff_* functions. Keeps the reference, not the name, so a deleted customer stays deleted. ──
create table public.bank_access_log (
  id bigint generated always as identity primary key,
  bank_id uuid not null references public.banks (id) on delete restrict,
  staff_user_id uuid references auth.users (id) on delete set null,
  staff_label text not null,
  customer_user_id uuid references auth.users (id) on delete set null,
  customer_ref text,
  reason text not null,
  at timestamptz not null default now()
);
create index bank_access_log_bank_idx on public.bank_access_log (bank_id, at desc, id desc);

-- ── Accounts a bank supplied. Customers can still only write their own manual ones. ──
alter table public.accounts add column bank_id uuid references public.banks (id) on delete restrict;
alter table public.accounts add column branch text;
alter table public.accounts drop constraint accounts_source_check;
alter table public.accounts add constraint accounts_source_check check (source in ('manual', 'aa', 'bank'));
alter table public.accounts add constraint accounts_bank_source_check check ((source = 'bank') = (bank_id is not null));
create index accounts_bank_idx on public.accounts (bank_id, user_id) where bank_id is not null;

-- A customer may read every account of theirs, but write only the ones they typed in. A bank's accounts, and later Account Aggregator's,
-- come from the supplier: letting a customer write them would let anyone forge what a bank appears to have said.
drop policy accounts_all on public.accounts;
create policy accounts_select on public.accounts for select to authenticated using (user_id = auth.uid());
create policy accounts_insert on public.accounts for insert to authenticated with check (user_id = auth.uid() and source = 'manual');
create policy accounts_update on public.accounts for update to authenticated using (user_id = auth.uid() and source = 'manual') with check (user_id = auth.uid() and source = 'manual');
create policy accounts_delete on public.accounts for delete to authenticated using (user_id = auth.uid() and source = 'manual');

-- ── Row level security. Customers read their own rows; staff read only their own staff row; nobody writes directly. ──
alter table public.banks enable row level security;
alter table public.bank_members enable row level security;
alter table public.bank_sharing_events enable row level security;
alter table public.bank_staff enable row level security;
alter table public.bank_access_log enable row level security;

create policy bank_members_select on public.bank_members for select to authenticated using (user_id = auth.uid());
create policy bank_sharing_events_select on public.bank_sharing_events for select to authenticated using (user_id = auth.uid());
create policy bank_staff_select on public.bank_staff for select to authenticated using (user_id = auth.uid());

revoke all on public.banks, public.bank_members, public.bank_sharing_events, public.bank_staff, public.bank_access_log from anon, authenticated;
revoke all on sequence public.bank_member_ref_seq from anon, authenticated;
grant select on public.bank_members, public.bank_sharing_events, public.bank_staff to authenticated;

-- ── Helpers, used only inside the functions below. Nobody calls them from outside. ──
-- "Rohit Kulkarni" as staff see it: "Rohit K.". With no name, the reference.
create function public.short_name(p_full text, p_ref text) returns text language sql immutable set search_path = public as $$
  select case
    when nullif(btrim(coalesce(p_full, '')), '') is null then p_ref
    when position(' ' in btrim(p_full)) = 0 then btrim(p_full)
    else split_part(btrim(p_full), ' ', 1) || ' ' || upper(left(regexp_replace(btrim(p_full), '^.* ', ''), 1)) || '.'
  end
$$;

create function public.bank_sharing_now(p_user uuid, p_bank uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select e.sharing from public.bank_sharing_events e where e.user_id = p_user and e.bank_id = p_bank order by e.at desc, e.seq desc limit 1), false)
$$;

create function public.staff_label(p_user uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(p.full_name), ''), u.email, 'Unknown') from auth.users u left join public.profiles p on p.id = u.id where u.id = p_user
$$;

revoke all on function public.short_name(text, text), public.bank_sharing_now(uuid, uuid), public.staff_label(uuid) from public, anon, authenticated;

-- ── What a customer, or a visitor, can do ──

-- A live bank's branding, found by its address. The only thing a visitor who isn't signed in can read about a bank, and nothing else comes with it.
create function public.bank_public(p_subdomain text)
returns table (id uuid, subdomain text, name text, install_name text, logo text, brand_colour text, on_brand_colour text, disclaimer text, english boolean, hindi boolean, advisor text)
language sql stable security definer set search_path = public as $$
  select b.id, b.subdomain, b.name, b.install_name, b.logo, b.brand_colour, b.on_brand_colour, b.disclaimer, b.english, b.hindi, b.advisor
  from public.banks b where b.subdomain = p_subdomain and b.status = 'live'
$$;

-- The caller joins a live bank. Doing it twice is fine.
create function public.join_bank(p_bank uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.banks b where b.id = p_bank and b.status = 'live') then
    raise exception 'bank not available' using errcode = 'P0002';
  end if;
  insert into public.bank_members (user_id, bank_id) values (auth.uid(), p_bank) on conflict do nothing;
end;
$$;

-- The caller turns sharing with a bank on or off. Only a member can, only a live bank can be shared with, and stopping is always allowed.
-- Saying what is already true records nothing, so the history only ever holds real changes.
create function public.set_bank_sharing(p_bank uuid, p_sharing boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.bank_members m where m.user_id = auth.uid() and m.bank_id = p_bank) then
    raise exception 'not a member of this bank' using errcode = '42501';
  end if;
  if p_sharing and not exists (select 1 from public.banks b where b.id = p_bank and b.status = 'live') then
    raise exception 'bank not available' using errcode = 'P0002';
  end if;
  if public.bank_sharing_now(auth.uid(), p_bank) = p_sharing then
    return;
  end if;
  insert into public.bank_sharing_events (user_id, bank_id, sharing) values (auth.uid(), p_bank, p_sharing);
end;
$$;

-- Whether the caller is sharing with a bank right now.
create function public.bank_sharing_state(p_bank uuid) returns boolean language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then false else public.bank_sharing_now(auth.uid(), p_bank) end
$$;

-- ── What bank staff can do. Each checks the caller's role at this bank, that the bank is live, and writes the access log. ──

-- Customers who are sharing right now. Admin, Marketing and Branch. A branch member sees only customers with an account at their branch.
create function public.staff_shared_customers(p_bank uuid) returns table (ref text, short_name text, sharing_since timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_staff public.bank_staff;
begin
  select s.* into v_staff from public.bank_staff s join public.banks b on b.id = s.bank_id
    where s.bank_id = p_bank and s.user_id = auth.uid() and s.role in ('admin', 'marketing', 'branch') and b.status = 'live';
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.bank_access_log (bank_id, staff_user_id, staff_label, reason) values (p_bank, auth.uid(), public.staff_label(auth.uid()), 'Listed customers who share');
  return query
    select m.ref, public.short_name(p.full_name, m.ref), l.at
    from (select distinct on (e.user_id) e.user_id, e.sharing, e.at from public.bank_sharing_events e where e.bank_id = p_bank order by e.user_id, e.at desc, e.seq desc) l
    join public.bank_members m on m.user_id = l.user_id and m.bank_id = p_bank
    join public.profiles p on p.id = l.user_id
    where l.sharing
      and (v_staff.role <> 'branch' or exists (select 1 from public.accounts a where a.user_id = l.user_id and a.bank_id = p_bank and a.branch = v_staff.branch))
    order by l.at desc;
end;
$$;

-- One customer, by reference: the accounts this bank supplied, and nothing the customer typed or holds elsewhere. Returns no row, and writes no log,
-- for a customer who isn't sharing, who isn't in this branch, or who doesn't exist: the three look the same.
create function public.staff_open_customer(p_bank uuid, p_ref text) returns table (ref text, short_name text, accounts jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_staff public.bank_staff;
  v_user uuid;
begin
  select s.* into v_staff from public.bank_staff s join public.banks b on b.id = s.bank_id
    where s.bank_id = p_bank and s.user_id = auth.uid() and s.role in ('admin', 'marketing', 'branch') and b.status = 'live';
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select m.user_id into v_user from public.bank_members m
    where m.bank_id = p_bank and m.ref = p_ref and public.bank_sharing_now(m.user_id, p_bank)
      and (v_staff.role <> 'branch' or exists (select 1 from public.accounts a where a.user_id = m.user_id and a.bank_id = p_bank and a.branch = v_staff.branch));
  if v_user is null then
    return;
  end if;
  insert into public.bank_access_log (bank_id, staff_user_id, staff_label, customer_user_id, customer_ref, reason)
    values (p_bank, auth.uid(), public.staff_label(auth.uid()), v_user, p_ref, 'Viewed customer');
  return query
    select m.ref, public.short_name(p.full_name, m.ref),
      coalesce((select jsonb_agg(jsonb_build_object('name', a.name, 'kind', a.kind, 'branch', a.branch, 'details', a.details) order by a.created_at)
                from public.accounts a where a.user_id = v_user and a.bank_id = p_bank and a.source = 'bank' and (v_staff.role <> 'branch' or a.branch = v_staff.branch)), '[]'::jsonb)
    from public.bank_members m join public.profiles p on p.id = m.user_id where m.user_id = v_user and m.bank_id = p_bank;
end;
$$;

-- How many customers are sharing and how many stopped, with the latest changes. Admin and Compliance.
create function public.staff_consent_ledger(p_bank uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sharing int;
  v_stopped int;
  v_changes jsonb;
begin
  if not exists (select 1 from public.bank_staff s join public.banks b on b.id = s.bank_id where s.bank_id = p_bank and s.user_id = auth.uid() and s.role in ('admin', 'compliance') and b.status = 'live') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.bank_access_log (bank_id, staff_user_id, staff_label, reason) values (p_bank, auth.uid(), public.staff_label(auth.uid()), 'Viewed consent ledger');
  select count(*) filter (where l.sharing), count(*) filter (where not l.sharing) into v_sharing, v_stopped
    from (select distinct on (e.user_id) e.user_id, e.sharing from public.bank_sharing_events e where e.bank_id = p_bank order by e.user_id, e.at desc, e.seq desc) l;
  select coalesce(jsonb_agg(jsonb_build_object('ref', m.ref, 'short_name', public.short_name(p.full_name, m.ref), 'sharing', c.sharing, 'at', c.at) order by c.at desc, c.seq desc), '[]'::jsonb)
    into v_changes
    from (select e.* from public.bank_sharing_events e where e.bank_id = p_bank order by e.at desc, e.seq desc limit 50) c
    join public.bank_members m on m.user_id = c.user_id and m.bank_id = p_bank
    join public.profiles p on p.id = c.user_id;
  return jsonb_build_object('sharing', v_sharing, 'stopped', v_stopped, 'changes', v_changes);
end;
$$;

-- Who looked at whom, newest first. Admin and Compliance. Reading the log is not itself logged.
create function public.staff_access_log(p_bank uuid) returns table (at timestamptz, staff_label text, customer_ref text, reason text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.bank_staff s join public.banks b on b.id = s.bank_id where s.bank_id = p_bank and s.user_id = auth.uid() and s.role in ('admin', 'compliance') and b.status = 'live') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select l.at, l.staff_label, l.customer_ref, l.reason from public.bank_access_log l where l.bank_id = p_bank order by l.at desc, l.id desc limit 500;
end;
$$;

-- Postgres lets everyone run a new function unless told otherwise, and Supabase grants it to the API roles. Say who, once, here.
revoke all on function public.bank_public(text), public.join_bank(uuid), public.set_bank_sharing(uuid, boolean), public.bank_sharing_state(uuid),
  public.staff_shared_customers(uuid), public.staff_open_customer(uuid, text), public.staff_consent_ledger(uuid), public.staff_access_log(uuid) from public, anon, authenticated;
grant execute on function public.bank_public(text) to anon, authenticated;
grant execute on function public.join_bank(uuid), public.set_bank_sharing(uuid, boolean), public.bank_sharing_state(uuid),
  public.staff_shared_customers(uuid), public.staff_open_customer(uuid, text), public.staff_consent_ledger(uuid), public.staff_access_log(uuid) to authenticated;

-- ── Your data, your call: the export now includes the banks you joined, what you chose to share, and who at a bank looked at you. ──
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
    'net_worth_snapshots', coalesce((select jsonb_agg(to_jsonb(n) order by n.taken_on) from public.net_worth_snapshots n where n.user_id = auth.uid()), '[]'::jsonb),
    'bank_memberships', coalesce((select jsonb_agg(jsonb_build_object('bank', b.name, 'reference', m.ref, 'joined_at', m.joined_at) order by m.joined_at) from public.bank_members m join public.banks b on b.id = m.bank_id where m.user_id = auth.uid()), '[]'::jsonb),
    'bank_sharing', coalesce((select jsonb_agg(jsonb_build_object('bank', b.name, 'sharing', e.sharing, 'at', e.at) order by e.at, e.seq) from public.bank_sharing_events e join public.banks b on b.id = e.bank_id where e.user_id = auth.uid()), '[]'::jsonb),
    'bank_access', coalesce((select jsonb_agg(jsonb_build_object('bank', b.name, 'reason', l.reason, 'at', l.at) order by l.at, l.id) from public.bank_access_log l join public.banks b on b.id = l.bank_id where l.customer_user_id = auth.uid()), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;
