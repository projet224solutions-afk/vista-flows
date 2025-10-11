-- Taxi Moto (Driver) minimal schema for real ops
create table if not exists public.taxi_drivers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique,
  is_online boolean default false,
  status text default 'offline', -- offline | available | on_trip
  last_lat numeric,
  last_lng numeric,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.taxi_trips (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid references public.taxi_drivers(id) on delete set null,
  customer_id uuid,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  pickup_address text,
  dropoff_address text,
  distance_km numeric,
  duration_min numeric,
  price_total numeric,
  driver_share numeric,
  platform_fee numeric,
  status text default 'requested', -- requested | accepted | arriving | picked_up | in_progress | completed | cancelled
  requested_at timestamptz default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

-- Realtime: enable RLS and basic policies (service role will perform server ops)
alter table if exists public.taxi_drivers enable row level security;
alter table if exists public.taxi_trips enable row level security;

-- Drivers can read/update themselves
create policy if not exists "drivers read self"
on public.taxi_drivers for select to authenticated
using (user_id = auth.uid());

create policy if not exists "drivers update self"
on public.taxi_drivers for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Trips read by involved users
create policy if not exists "trips read by driver or customer"
on public.taxi_trips for select to authenticated
using (
  (driver_id is not null and exists (
    select 1 from public.taxi_drivers d where d.id = taxi_trips.driver_id and d.user_id = auth.uid()
  ))
  or customer_id = auth.uid()
);


