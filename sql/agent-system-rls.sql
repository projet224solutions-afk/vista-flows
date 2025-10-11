-- Agent System RLS Policies
alter table if exists public.orders enable row level security;
alter table if exists public.order_items enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.inventory enable row level security;
alter table if exists public.agents_management enable row level security;

-- Orders: insert/select by vendor owner
create policy if not exists "vendor can insert own orders"
on public.orders for insert to authenticated
with check (
  exists (
    select 1 from public.vendors v
    where v.id = orders.vendor_id
      and v.user_id = auth.uid()
  )
);

create policy if not exists "vendor can read own orders"
on public.orders for select to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = orders.vendor_id
      and v.user_id = auth.uid()
  )
);

-- Order items
create policy if not exists "insert items for own orders"
on public.order_items for insert to authenticated
with check (
  exists (
    select 1
    from public.orders o
    join public.vendors v on v.id = o.vendor_id
    where o.id = order_items.order_id
      and v.user_id = auth.uid()
  )
);

create policy if not exists "read items for own orders"
on public.order_items for select to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.vendors v on v.id = o.vendor_id
    where o.id = order_items.order_id
      and v.user_id = auth.uid()
  )
);

-- Products
create policy if not exists "vendor can update own products stock"
on public.products for update to authenticated
using (
  exists (
    select 1 from public.vendors v
    where v.id = products.vendor_id
      and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vendors v
    where v.id = products.vendor_id
      and v.user_id = auth.uid()
  )
);

create policy if not exists "read active products"
on public.products for select to anon, authenticated
using (coalesce(is_active, true));

-- Inventory
create policy if not exists "vendor can update own inventory"
on public.inventory for update to authenticated
using (
  exists (
    select 1
    from public.products p
    join public.vendors v on v.id = p.vendor_id
    where p.id = inventory.product_id
      and v.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.products p
    join public.vendors v on v.id = p.vendor_id
    where p.id = inventory.product_id
      and v.user_id = auth.uid()
  )
);

-- Agents management (PDG scope)
create policy if not exists "pdg manage own agents"
on public.agents_management for all to authenticated
using (
  exists (
    select 1
    from public.pdg_management pdg
    where pdg.id = agents_management.pdg_id
      and pdg.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pdg_management pdg
    where pdg.id = agents_management.pdg_id
      and pdg.user_id = auth.uid()
  )
);


