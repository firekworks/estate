begin;
alter table public.estate_properties drop constraint estate_properties_property_type_check;
alter table public.estate_properties add constraint estate_properties_property_type_check check (property_type in ('apartment','house','studio','commercial','office','land','building','garage','other'));
alter table public.estate_properties drop constraint estate_properties_stage_check;
alter table public.estate_properties add constraint estate_properties_stage_check check (stage in ('watchlist','analyzing','visit','negotiating','financing','deposit','discarded','purchased','rehab','marketing','managed','sold'));
alter table public.estate_properties alter column occupancy_status set default 'unknown';
alter table public.estate_properties add column stage_entered_at timestamptz not null default now();

create function public.estate_guard_stage() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.stage is distinct from old.stage then
    if new.stage not in ('discarded','watchlist') and exists (select 1 from public.estate_risks where property_id=new.id and user_id=new.user_id and is_kill_switch and resolved_at is null) then
      raise exception 'ESTATE_KILL_SWITCH: resuelve los riesgos bloqueantes antes de cambiar de fase';
    end if;
    new.stage_entered_at=now();
    insert into public.estate_audit_events(user_id,property_id,event_type,entity_type,source,payload)
      values(new.user_id,new.id,'stage_changed','property','database',jsonb_build_object('from',old.stage,'to',new.stage));
  end if;
  return new;
end $$;
create trigger estate_guard_stage before update of stage on public.estate_properties for each row execute function public.estate_guard_stage();

create table public.estate_tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 title text not null check(length(title) between 1 and 500), due_at timestamptz, owner_label text, status text not null default 'open' check(status in ('open','done')),
 created_at timestamptz not null default now(), foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_visits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 scheduled_at timestamptz not null, completed_at timestamptz, notes text, checklist jsonb not null default '{}',
 created_at timestamptz not null default now(), foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_offers (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 amount numeric(14,2) not null check(amount>0), direction text not null check(direction in ('offer','counteroffer')), conditions text, expires_at timestamptz,
 created_at timestamptz not null default now(), foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_actual_performance (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 period date not null, rent_received numeric(14,2) not null check(rent_received>=0), operating_expenses numeric(14,2) not null check(operating_expenses>=0), debt_payment numeric(14,2) not null check(debt_payment>=0), capex numeric(14,2) not null check(capex>=0),
 debt_balance numeric(14,2) check(debt_balance>=0), valuation numeric(14,2) check(valuation>0), occupied_days integer check(occupied_days between 0 and 31),
 forecast jsonb not null, source text not null check(length(source)>0), created_at timestamptz not null default now(), unique(property_id,period),
 foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_comparables (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid,
 municipality text not null, property_type text not null, transaction_type text not null check(transaction_type in ('rent','sale')),
 price numeric(14,2) not null check(price>0), area_m2 numeric(10,2) not null check(area_m2>0), bedrooms integer, floor_label text, has_elevator boolean, condition text,
 latitude double precision check(latitude between -90 and 90), longitude double precision check(longitude between -180 and 180),
 source text not null, url text not null check(url ~ '^https?://'), observed_at date not null,
 similarity numeric(5,4) check(similarity between 0 and 1), created_at timestamptz not null default now(), unique(user_id,url,observed_at),
 foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_evidence (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 field text not null, kind text not null check(kind in ('fact','estimate','assumption')), value jsonb, source text not null, url text, observed_at timestamptz not null,
 method text not null, confidence numeric(5,4) not null check(confidence between 0 and 1), created_at timestamptz not null default now(),
 foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_documents (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 title text not null, url text not null check(url ~ '^https?://'), category text not null, verified_at timestamptz,
 created_at timestamptz not null default now(), foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
create table public.estate_tenancies (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), property_id uuid not null,
 stage text not null check(stage in ('ready','marketing','leads','visits','screening','contract','occupied','ended')), asking_rent numeric(14,2) check(asking_rent>=0), achieved_rent numeric(14,2) check(achieved_rent>=0),
 started_at date, ended_at date, channel text, channel_cost numeric(14,2) check(channel_cost>=0), leads integer check(leads>=0), visits integer check(visits>=0),
 created_at timestamptz not null default now(), foreign key(property_id,user_id) references public.estate_properties(id,user_id) on delete cascade
);
do $$ declare t text; begin
 foreach t in array array['estate_tasks','estate_visits','estate_offers','estate_actual_performance','estate_comparables','estate_evidence','estate_documents','estate_tenancies'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('revoke all on public.%I from anon',t);
 execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t||'_owner',t);
 execute format('create index %I on public.%I(property_id,user_id)',t||'_parent_idx',t);
 execute format('create index %I on public.%I(user_id,created_at desc)',t||'_owner_idx',t);
 end loop;
end $$;

-- Atomic write keeps property, source and analysis together on retries/errors.
create or replace function public.estate_save_analysis(p_property jsonb, p_inputs jsonb, p_outputs jsonb, p_listing jsonb, p_property_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare uid uuid:=auth.uid(); pid uuid:=p_property_id; lid uuid; previous_price numeric; price numeric:=(p_inputs->>'purchasePrice')::numeric;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if price is null or price<=0 or nullif(p_property->>'title','') is null then raise exception 'Nombre y precio positivo requeridos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if pid is null and nullif(p_listing->>'url','') is not null then
  select property_id into pid from public.estate_listings where user_id=uid and url=p_listing->>'url' limit 1;
 end if;
 if pid is null then
  insert into public.estate_properties(user_id,title,property_type,municipality,province,address,built_area_m2,usable_area_m2,bedrooms,bathrooms,floor_label,has_elevator,has_terrace,has_balcony,has_garage,has_storage,has_pool,orientation,year_built,energy_rating,condition,latitude,longitude,features,notes)
  values(uid,p_property->>'title',p_property->>'property_type',p_property->>'municipality',p_property->>'province',p_property->>'address',(p_property->>'built_area_m2')::numeric,(p_property->>'usable_area_m2')::numeric,(p_property->>'bedrooms')::smallint,(p_property->>'bathrooms')::smallint,p_property->>'floor_label',(p_property->>'has_elevator')::boolean,(p_property->>'has_terrace')::boolean,(p_property->>'has_balcony')::boolean,(p_property->>'has_garage')::boolean,(p_property->>'has_storage')::boolean,(p_property->>'has_pool')::boolean,p_property->>'orientation',(p_property->>'year_built')::smallint,p_property->>'energy_rating',p_property->>'condition',(p_property->>'latitude')::numeric,(p_property->>'longitude')::numeric,coalesce(p_property->'features','{}'),p_property->>'notes') returning id into pid;
 else
  update public.estate_properties set title=p_property->>'title',property_type=p_property->>'property_type',municipality=p_property->>'municipality',province=p_property->>'province',address=p_property->>'address',built_area_m2=(p_property->>'built_area_m2')::numeric,usable_area_m2=(p_property->>'usable_area_m2')::numeric,bedrooms=(p_property->>'bedrooms')::smallint,bathrooms=(p_property->>'bathrooms')::smallint,floor_label=p_property->>'floor_label',has_elevator=(p_property->>'has_elevator')::boolean,has_terrace=(p_property->>'has_terrace')::boolean,has_balcony=(p_property->>'has_balcony')::boolean,has_garage=(p_property->>'has_garage')::boolean,has_storage=(p_property->>'has_storage')::boolean,has_pool=(p_property->>'has_pool')::boolean,orientation=p_property->>'orientation',year_built=(p_property->>'year_built')::smallint,energy_rating=p_property->>'energy_rating',condition=p_property->>'condition',latitude=(p_property->>'latitude')::numeric,longitude=(p_property->>'longitude')::numeric,features=coalesce(p_property->'features','{}'),notes=p_property->>'notes' where id=pid and user_id=uid;
  if not found then raise exception 'Property unavailable'; end if;
 end if;
 select id,asking_price into lid,previous_price from public.estate_listings where property_id=pid and user_id=uid and url is not distinct from nullif(p_listing->>'url','') order by updated_at desc limit 1;
 if lid is null then
  insert into public.estate_listings(user_id,property_id,url,portal,asking_price) values(uid,pid,nullif(p_listing->>'url',''),coalesce(p_listing->>'portal','manual'),price) returning id into lid;
 else
  update public.estate_listings set asking_price=price,last_seen_at=now() where id=lid and user_id=uid;
 end if;
 insert into public.estate_listing_history(user_id,listing_id,asking_price,event_type,payload) values(uid,lid,price,case when price<previous_price then 'price_drop' when price>previous_price then 'price_increase' else 'snapshot' end,jsonb_build_object('previous_price',previous_price));
 insert into public.estate_deal_analyses(user_id,property_id,strategy,model_version,inputs,outputs,score,score_components,stress_test,data_confidence,verdict)
 values(uid,pid,'traditional_rental',p_outputs->>'engineVersion',p_inputs,p_outputs,(p_outputs->>'score')::numeric,p_outputs->'scoreComponents',p_outputs->'stress',(p_inputs->>'dataConfidence')::numeric,case p_outputs->>'verdict' when 'DESCARTAR' then 'discard' when 'MONITORIZAR' then 'monitor' when 'ANALIZAR' then 'analyze' when 'VISITAR' then 'visit' else 'negotiate' end);
 insert into public.estate_audit_events(user_id,property_id,event_type,entity_type,source,model_version) values(uid,pid,'analysis_version_created','deal_analysis','estate_v2',p_outputs->>'engineVersion');
 return pid;
end $$;
revoke all on function public.estate_save_analysis(jsonb,jsonb,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.estate_save_analysis(jsonb,jsonb,jsonb,jsonb,uuid) to authenticated;

create table public.estate_provider_budgets (
 user_id uuid not null references auth.users(id), provider text not null,
 monthly_request_limit integer not null default 0 check(monthly_request_limit>=0),
 monthly_budget_eur numeric(12,4) not null default 0 check(monthly_budget_eur>=0),
 reserve_per_request_eur numeric(12,4) not null default 0 check(reserve_per_request_eur>=0),
 primary key(user_id,provider)
);
create table public.estate_provider_usage (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),provider text not null,
 reserved_cost_eur numeric(12,4) not null, created_at timestamptz not null default now()
);
create index estate_provider_usage_owner_time_idx on public.estate_provider_usage(user_id,provider,created_at);
alter table public.estate_provider_budgets enable row level security;
alter table public.estate_provider_usage enable row level security;
revoke all on public.estate_provider_budgets,public.estate_provider_usage from anon,authenticated;
grant select on public.estate_provider_budgets,public.estate_provider_usage to authenticated;
create policy estate_budget_read on public.estate_provider_budgets for select to authenticated using((select auth.uid())=user_id);
create policy estate_usage_read on public.estate_provider_usage for select to authenticated using((select auth.uid())=user_id);
create schema if not exists estate_private;
revoke all on schema estate_private from public;
grant usage on schema estate_private to authenticated;
create function estate_private.reserve_provider(p_provider text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); b public.estate_provider_budgets; calls bigint; cost numeric; reservation uuid;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into b from public.estate_provider_budgets where user_id=uid and provider=p_provider for update;
 if not found or b.monthly_request_limit=0 or b.monthly_budget_eur=0 or b.reserve_per_request_eur=0 then raise exception 'ESTATE_BUDGET_SETUP: proveedor desactivado hasta configurar presupuesto'; end if;
 select count(*),coalesce(sum(reserved_cost_eur),0) into calls,cost from public.estate_provider_usage where user_id=uid and provider=p_provider and created_at>=date_trunc('month',now());
 if calls>=b.monthly_request_limit or cost+b.reserve_per_request_eur>b.monthly_budget_eur then raise exception 'ESTATE_BUDGET_LIMIT: límite mensual alcanzado'; end if;
 insert into public.estate_provider_usage(user_id,provider,reserved_cost_eur) values(uid,p_provider,b.reserve_per_request_eur) returning id into reservation;
 return reservation;
end $$;
revoke all on function estate_private.reserve_provider(text) from public,anon;
grant execute on function estate_private.reserve_provider(text) to authenticated;
create function public.estate_reserve_provider(p_provider text) returns uuid language sql security invoker set search_path='' as $$ select estate_private.reserve_provider(p_provider); $$;
revoke all on function public.estate_reserve_provider(text) from public,anon;
grant execute on function public.estate_reserve_provider(text) to authenticated;

alter table public.estate_risks drop constraint estate_risks_category_check;
alter table public.estate_risks add constraint estate_risks_category_check check(category in ('financial','technical','legal','rental','market','liquidity','financing','renovation','environmental','building','community','tenant','occupancy'));
alter table public.estate_actual_performance add constraint estate_actual_month_start check(extract(day from period)=1);
create function public.estate_validate_actual() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.estate_properties where id=new.property_id and user_id=new.user_id and stage in ('purchased','rehab','marketing','managed','sold')) then
  raise exception 'Solo activos comprados admiten resultados reales';
 end if;
 if new.occupied_days > extract(day from (new.period + interval '1 month - 1 day')) then raise exception 'Dias ocupados exceden el mes'; end if;
 return new;
end $$;
create trigger estate_validate_actual before insert or update on public.estate_actual_performance for each row execute function public.estate_validate_actual();
create function public.estate_visit_findings() returns trigger language plpgsql security invoker set search_path='' as $$
declare finding record; n integer:=0;
begin
 if new.completed_at is null then return new; end if;
 if tg_op='UPDATE' and old.completed_at is not null then return new; end if;
 for finding in select key,value from jsonb_each_text(new.checklist) loop
  if finding.value='needs_inspection' then
   insert into public.estate_risks(user_id,property_id,category,severity,confidence,title,description,source,is_kill_switch)
   values(new.user_id,new.property_id,case when finding.key='Ocupación' then 'occupancy' when finding.key='Licencia y uso' then 'legal' else 'technical' end,50,1,
   'Visita: '||finding.key,'Comprobación pendiente de inspección profesional. No constituye un diagnóstico.','visit:'||new.id,true);
   n:=n+1;
  end if;
 end loop;
 if n>0 then
  insert into public.estate_tasks(user_id,property_id,title) values(new.user_id,new.property_id,'Resolver '||n||' hallazgos de visita e incorporar presupuestos al análisis');
 end if;
 insert into public.estate_audit_events(user_id,property_id,event_type,entity_type,source,payload) values(new.user_id,new.property_id,'visit_completed','visit','estate',jsonb_build_object('visit_id',new.id,'findings',n));
 return new;
end $$;
create trigger estate_visit_findings after insert or update on public.estate_visits for each row execute function public.estate_visit_findings();

commit;
