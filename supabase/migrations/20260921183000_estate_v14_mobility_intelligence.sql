create table if not exists public.estate_mobility_datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_key text not null default 'manual_csv',
  mode text not null default 'mixed' check (mode in ('walk','drive','bike','transit','mixed')),
  area_label text,
  observed_from timestamptz,
  observed_to timestamptz,
  resolution_m integer check (resolution_m is null or resolution_m > 0),
  unit text not null default 'index',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.estate_mobility_points (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  value double precision not null check (value >= 0),
  mode text not null default 'mixed' check (mode in ('walk','drive','bike','transit','mixed')),
  label text,
  observed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint estate_mobility_points_dataset_user_fkey
    foreign key (dataset_id, user_id)
    references public.estate_mobility_datasets(id, user_id)
    on delete cascade
);

create index if not exists estate_mobility_datasets_user_created_idx
  on public.estate_mobility_datasets(user_id, created_at desc);
create index if not exists estate_mobility_points_dataset_idx
  on public.estate_mobility_points(dataset_id);
create index if not exists estate_mobility_points_user_mode_idx
  on public.estate_mobility_points(user_id, mode);
create index if not exists estate_mobility_points_lat_lng_idx
  on public.estate_mobility_points(lat, lng);

alter table public.estate_mobility_datasets enable row level security;
alter table public.estate_mobility_points enable row level security;

create policy "estate_mobility_datasets_select_own" on public.estate_mobility_datasets
  for select to authenticated using (auth.uid() = user_id);
create policy "estate_mobility_datasets_insert_own" on public.estate_mobility_datasets
  for insert to authenticated with check (auth.uid() = user_id);
create policy "estate_mobility_datasets_update_own" on public.estate_mobility_datasets
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "estate_mobility_datasets_delete_own" on public.estate_mobility_datasets
  for delete to authenticated using (auth.uid() = user_id);

create policy "estate_mobility_points_select_own" on public.estate_mobility_points
  for select to authenticated using (auth.uid() = user_id);
create policy "estate_mobility_points_insert_own" on public.estate_mobility_points
  for insert to authenticated with check (auth.uid() = user_id);
create policy "estate_mobility_points_update_own" on public.estate_mobility_points
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "estate_mobility_points_delete_own" on public.estate_mobility_points
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.estate_mobility_touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger estate_mobility_datasets_touch_updated_at
before update on public.estate_mobility_datasets
for each row execute function public.estate_mobility_touch_updated_at();

comment on table public.estate_mobility_datasets is
  'Estate mobility/footfall datasets imported from public, licensed or manual sources. Never stores individual-level traces.';
comment on table public.estate_mobility_points is
  'Aggregated mobility intensity points only. No device identifiers or person-level trajectories.';
