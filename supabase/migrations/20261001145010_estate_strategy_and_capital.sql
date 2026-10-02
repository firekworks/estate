create table public.estate_strategy_snapshots (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,property_id uuid not null,
 inputs jsonb not null,outputs jsonb not null,model_version text not null,created_at timestamptz not null default now(),
 foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
alter table public.estate_strategy_snapshots enable row level security;
revoke all on public.estate_strategy_snapshots from anon;
grant select,insert,delete on public.estate_strategy_snapshots to authenticated;
create policy estate_strategy_snapshots_owner on public.estate_strategy_snapshots for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create index estate_strategy_snapshots_owner_idx on public.estate_strategy_snapshots(user_id,created_at desc);
create index estate_strategy_snapshots_parent_idx on public.estate_strategy_snapshots(property_id,user_id);
alter table public.estate_risks add column owner_label text, add column due_at timestamptz;
alter table public.estate_renovation_items add column quantity numeric not null default 1 check(quantity>0), add column unit_cost numeric check(unit_cost>=0), add column materials numeric check(materials>=0), add column labor numeric check(labor>=0), add column contingency_pct numeric not null default 0 check(contingency_pct between 0 and 100), add column supplier_quote_url text, add column risk_reduction numeric check(risk_reduction between 0 and 100);
