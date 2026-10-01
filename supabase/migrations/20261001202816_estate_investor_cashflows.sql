create table public.estate_investor_cashflows (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,property_id uuid not null,
 occurred_at date not null,amount numeric(14,2) not null check(amount>0),direction text not null check(direction in ('contribution','distribution')),source text not null check(length(source)>0),created_at timestamptz not null default now(),
 foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
alter table public.estate_investor_cashflows enable row level security;
revoke all on public.estate_investor_cashflows from anon;
grant select,insert,update,delete on public.estate_investor_cashflows to authenticated;
create policy estate_investor_cashflows_owner on public.estate_investor_cashflows for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create index estate_investor_cashflows_owner_idx on public.estate_investor_cashflows(user_id,occurred_at);
create index estate_investor_cashflows_parent_idx on public.estate_investor_cashflows(property_id,user_id);
