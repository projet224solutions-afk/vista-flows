-- Example Supabase schema for Agent System
-- Users table (managed by Supabase auth; this is an application-level profile)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  role text not null check (role in ('pdg','agent','sub_agent')),
  parent_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- PDG management
create table if not exists public.pdg_management (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  name text not null,
  email text not null,
  phone text,
  permissions text[] default array['all']::text[],
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- Agents
create table if not exists public.agents_management (
  id uuid primary key default uuid_generate_v4(),
  pdg_id uuid not null references public.pdg_management(id) on delete cascade,
  agent_code text not null unique,
  name text not null,
  email text not null,
  phone text not null,
  is_active boolean default true,
  permissions text[] default array['create_users']::text[],
  commission_rate numeric default 0.2,
  can_create_sub_agent boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric not null,
  created_at timestamp with time zone default now()
);

-- Commissions
create table if not exists public.commissions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references public.agents_management(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamp with time zone default now()
);
