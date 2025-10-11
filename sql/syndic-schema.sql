-- Bureau Syndical schema (minimal)
create table if not exists public.bureaus (
  id uuid primary key default uuid_generate_v4(),
  bureau_code text unique not null,
  prefecture text not null,
  commune text not null,
  full_location text,
  president_name text,
  president_email text,
  president_phone text,
  status text default 'active',
  total_members int default 0,
  total_vehicles int default 0,
  total_cotisations numeric default 0,
  created_at timestamptz default now(),
  validated_at timestamptz,
  last_activity timestamptz
);

create table if not exists public.members (
  id uuid primary key default uuid_generate_v4(),
  bureau_id uuid references public.bureaus(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  license_number text,
  vehicle_type text,
  vehicle_serial text,
  status text default 'active',
  cotisation_status text default 'pending',
  join_date date,
  last_cotisation_date date,
  total_cotisations numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  bureau_id uuid references public.bureaus(id) on delete cascade,
  owner_member_id uuid references public.members(id) on delete set null,
  serial_number text unique,
  type text,
  brand text,
  model text,
  year int,
  status text default 'active',
  insurance_expiry date,
  last_inspection date,
  created_at timestamptz default now()
);

create table if not exists public.bureau_transactions (
  id uuid primary key default uuid_generate_v4(),
  bureau_id uuid references public.bureaus(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  type text not null,
  amount numeric not null,
  description text,
  date date not null,
  status text default 'completed',
  created_at timestamptz default now()
);

create table if not exists public.sos_alerts (
  id uuid primary key default uuid_generate_v4(),
  bureau_id uuid references public.bureaus(id) on delete cascade,
  member_name text,
  vehicle_serial text,
  alert_type text,
  severity text,
  latitude numeric,
  longitude numeric,
  address text,
  description text,
  status text default 'active',
  created_at timestamptz default now()
);


