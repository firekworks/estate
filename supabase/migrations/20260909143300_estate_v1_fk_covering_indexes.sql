-- Cover composite ownership foreign keys in the same column order PostgreSQL checks them.
-- This complements query-oriented indexes such as (user_id, property_id, ...).

create index if not exists estate_listings_property_owner_cover_idx
  on public.estate_listings(property_id, user_id);

create index if not exists estate_listing_history_listing_owner_cover_idx
  on public.estate_listing_history(listing_id, user_id);

create index if not exists estate_property_images_property_owner_cover_idx
  on public.estate_property_images(property_id, user_id);

create index if not exists estate_market_estimates_property_owner_cover_idx
  on public.estate_market_estimates(property_id, user_id);

create index if not exists estate_financing_property_owner_cover_idx
  on public.estate_financing_scenarios(property_id, user_id);

create index if not exists estate_renovation_property_owner_cover_idx
  on public.estate_renovation_items(property_id, user_id);

create index if not exists estate_deal_analyses_property_owner_cover_idx
  on public.estate_deal_analyses(property_id, user_id);

create index if not exists estate_risks_property_owner_cover_idx
  on public.estate_risks(property_id, user_id);

create index if not exists estate_audit_property_owner_cover_idx
  on public.estate_audit_events(property_id, user_id);
