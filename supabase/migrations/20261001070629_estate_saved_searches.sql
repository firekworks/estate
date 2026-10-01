create table public.estate_saved_searches (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), criteria jsonb not null, created_at timestamptz not null default now()
);
alter table public.estate_saved_searches enable row level security;
revoke all on public.estate_saved_searches from anon;
grant select,insert,update,delete on public.estate_saved_searches to authenticated;
create policy estate_saved_searches_owner on public.estate_saved_searches for all to authenticated using ((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create index estate_saved_searches_owner_idx on public.estate_saved_searches(user_id,created_at desc);
