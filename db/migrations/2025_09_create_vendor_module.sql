BEGIN;

create table if not exists vendors (
  id serial primary key,
  user_id integer not null,
  name text,
  created_at timestamp default now()
);

create table if not exists products (
  id serial primary key,
  vendor_id integer not null references vendors(id),
  name text not null,
  sku text,
  price numeric default 0,
  reorder_level integer default 0,
  created_at timestamp default now()
);

create table if not exists stock (
  id serial primary key,
  product_id integer not null references products(id),
  warehouse_id integer,
  quantity integer default 0,
  lot_number text,
  expiry_date date
);

create table if not exists orders (
  id serial primary key,
  vendor_id integer not null references vendors(id),
  total numeric default 0,
  status text default 'pending',
  created_at timestamp default now()
);

create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders(id),
  product_id integer not null references products(id),
  quantity integer default 1,
  unit_price numeric default 0
);

COMMIT;


