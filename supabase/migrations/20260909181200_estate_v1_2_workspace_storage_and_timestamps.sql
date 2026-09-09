create or replace function public.estate_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.estate_property_images
  add column if not exists updated_at timestamptz not null default now();
alter table public.estate_renovation_items
  add column if not exists updated_at timestamptz not null default now();
alter table public.estate_risks
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists estate_properties_touch_updated_at on public.estate_properties;
create trigger estate_properties_touch_updated_at before update on public.estate_properties
for each row execute function public.estate_touch_updated_at();

drop trigger if exists estate_listings_touch_updated_at on public.estate_listings;
create trigger estate_listings_touch_updated_at before update on public.estate_listings
for each row execute function public.estate_touch_updated_at();

drop trigger if exists estate_financing_touch_updated_at on public.estate_financing_scenarios;
create trigger estate_financing_touch_updated_at before update on public.estate_financing_scenarios
for each row execute function public.estate_touch_updated_at();

drop trigger if exists estate_investor_profiles_touch_updated_at on public.estate_investor_profiles;
create trigger estate_investor_profiles_touch_updated_at before update on public.estate_investor_profiles
for each row execute function public.estate_touch_updated_at();

drop trigger if exists estate_property_images_touch_updated_at on public.estate_property_images;
create trigger estate_property_images_touch_updated_at before update on public.estate_property_images
for each row execute function public.estate_touch_updated_at();

drop trigger if exists estate_renovation_items_touch_updated_at on public.estate_renovation_items;
create trigger estate_renovation_items_touch_updated_at before update on public.estate_renovation_items
for each row execute function public.estate_touch_updated_at();

drop trigger if exists estate_risks_touch_updated_at on public.estate_risks;
create trigger estate_risks_touch_updated_at before update on public.estate_risks
for each row execute function public.estate_touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estate-property-images',
  'estate-property-images',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "estate images select own" on storage.objects;
create policy "estate images select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'estate-property-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "estate images insert own" on storage.objects;
create policy "estate images insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'estate-property-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "estate images update own" on storage.objects;
create policy "estate images update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'estate-property-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'estate-property-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "estate images delete own" on storage.objects;
create policy "estate images delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'estate-property-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
