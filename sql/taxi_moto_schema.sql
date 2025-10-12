-- Taxi/Moto core schema for 224SOLUTIONS

create extension if not exists pgcrypto;

-- ✅ Correction: déplacer les extensions hors du schéma public
create schema if not exists extensions;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'cube') then
    alter extension cube set schema extensions;
  else
    create extension if not exists cube with schema extensions;
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'earthdistance') then
    alter extension earthdistance set schema extensions;
  else
    create extension if not exists earthdistance with schema extensions;
  end if;
end $$;

-- Drivers
create table if not exists public.taxi_drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_online boolean default false,
  vehicle jsonb default '{}'::jsonb,
  rating numeric(3,2) default 5.00,
  total_rides integer default 0,
  total_earnings numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Rides
create table if not exists public.taxi_rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid references public.taxi_drivers(id) on delete set null,
  status text not null default 'requested',
  pickup jsonb not null,
  dropoff jsonb not null,
  distance_km numeric(8,2),
  duration_min numeric(8,2),
  price numeric(12,2),
  commission_rate numeric(5,2) default 0.20,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Driver live locations (last known)
create table if not exists public.taxi_driver_locations (
  driver_id uuid primary key references public.taxi_drivers(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz default now()
);

-- Payments (record of payments for rides)
create table if not exists public.taxi_payments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.taxi_rides(id) on delete cascade,
  method text not null check (method in ('wallet','card','mobile_money')),
  amount numeric(12,2) not null,
  status text not null default 'paid',
  created_at timestamptz default now()
);

-- Notifications
create table if not exists public.taxi_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  driver_id uuid references public.taxi_drivers(id) on delete cascade,
  type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Ratings
create table if not exists public.taxi_ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.taxi_rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  driver_id uuid not null references public.taxi_drivers(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- Basic triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_taxi_drivers on public.taxi_drivers;
create trigger set_updated_at_taxi_drivers before update on public.taxi_drivers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_taxi_rides on public.taxi_rides;
create trigger set_updated_at_taxi_rides before update on public.taxi_rides
for each row execute function public.set_updated_at();

-- RLS
alter table public.taxi_drivers enable row level security;
alter table public.taxi_rides enable row level security;
alter table public.taxi_driver_locations enable row level security;
alter table public.taxi_payments enable row level security;
alter table public.taxi_notifications enable row level security;
alter table public.taxi_ratings enable row level security;

-- Policies (service role default)
drop policy if exists service_role_all on public.taxi_drivers;
create policy service_role_all on public.taxi_drivers
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_all on public.taxi_rides;
create policy service_role_all on public.taxi_rides
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_all on public.taxi_driver_locations;
create policy service_role_all on public.taxi_driver_locations
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_all on public.taxi_payments;
create policy service_role_all on public.taxi_payments
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_all on public.taxi_notifications;
create policy service_role_all on public.taxi_notifications
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists service_role_all on public.taxi_ratings;
create policy service_role_all on public.taxi_ratings
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Minimal user/driver visibility
drop policy if exists driver_manage_self on public.taxi_drivers;
create policy driver_manage_self on public.taxi_drivers
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists user_view_own_rides on public.taxi_rides;
create policy user_view_own_rides on public.taxi_rides
  for select using (((select auth.uid()) = user_id) or exists (
    select 1 from public.taxi_drivers d where d.id = taxi_rides.driver_id and d.user_id = (select auth.uid())
  ));

-- Indexes
create index if not exists taxi_rides_user_id_idx on public.taxi_rides(user_id);
create index if not exists taxi_rides_driver_id_idx on public.taxi_rides(driver_id);
create index if not exists taxi_driver_locations_coord_idx on public.taxi_driver_locations using gist (ll_to_earth(lat, lng));


