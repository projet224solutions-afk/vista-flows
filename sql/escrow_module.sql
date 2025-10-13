-- Escrow Module - 224SOLUTIONS
-- Creates escrow_transactions and RPC functions to initiate, release, refund, and dispute

-- Table: escrow_transactions
create table if not exists public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payer_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(15,2) not null,
  currency text not null default 'GNF',
  status text not null default 'pending', -- pending | released | refunded | dispute
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists escrow_transactions_order_idx on public.escrow_transactions(order_id);
create index if not exists escrow_transactions_receiver_idx on public.escrow_transactions(receiver_id);
create index if not exists escrow_transactions_payer_idx on public.escrow_transactions(payer_id);

-- Ensure wallets exist helper
create or replace function public.ensure_wallet(p_user_id uuid, p_currency text default 'GNF')
returns uuid as $$
declare v_id uuid; begin
  select id into v_id from public.wallets where user_id = p_user_id and currency = p_currency limit 1;
  if v_id is null then
    insert into public.wallets(user_id, balance, currency, status)
    values(p_user_id, 0, p_currency, 'active') returning id into v_id;
  end if;
  return v_id;
end; $$ language plpgsql security definer set search_path = public;

-- ENV binding: platform escrow account user id stored in setting
-- For simplicity, store in a dedicated table if not already present
create table if not exists public.platform_settings (
  key text primary key,
  value text not null
);

-- RPC: initiate escrow (moves funds from payer wallet to platform escrow wallet)
create or replace function public.initiate_escrow(
  p_order_id uuid,
  p_payer_id uuid,
  p_receiver_id uuid,
  p_amount numeric,
  p_currency text default 'GNF'
) returns uuid as $$
declare
  v_platform_user uuid;
  v_platform_wallet uuid;
  v_payer_wallet uuid;
  v_balance numeric;
  v_tx_id uuid;
begin
  if p_amount <= 0 then raise exception 'Invalid amount'; end if;

  -- read platform escrow user id
  select value::uuid into v_platform_user from public.platform_settings where key = 'ESCROW_PLATFORM_USER_ID';
  if v_platform_user is null then raise exception 'ESCROW platform user missing'; end if;

  v_payer_wallet := public.ensure_wallet(p_payer_id, p_currency);
  v_platform_wallet := public.ensure_wallet(v_platform_user, p_currency);

  select balance into v_balance from public.wallets where id = v_payer_wallet;
  if coalesce(v_balance,0) < p_amount then raise exception 'Insufficient balance'; end if;

  -- move funds to platform escrow wallet
  update public.wallets set balance = balance - p_amount, updated_at = now() where id = v_payer_wallet;
  update public.wallets set balance = balance + p_amount, updated_at = now() where id = v_platform_wallet;

  insert into public.escrow_transactions(order_id, payer_id, receiver_id, amount, currency, status)
  values(p_order_id, p_payer_id, p_receiver_id, p_amount, p_currency, 'pending') returning id into v_tx_id;

  return v_tx_id;
end; $$ language plpgsql security definer set search_path = public;

-- RPC: release escrow to receiver (optionally with commission)
create or replace function public.release_escrow(
  p_escrow_id uuid,
  p_commission_percent numeric default 0
) returns boolean as $$
declare
  v_tx record;
  v_platform_user uuid;
  v_platform_wallet uuid;
  v_receiver_wallet uuid;
  v_fee numeric;
  v_net numeric;
begin
  select * into v_tx from public.escrow_transactions where id = p_escrow_id and status = 'pending';
  if not found then raise exception 'Escrow not found or not pending'; end if;

  select value::uuid into v_platform_user from public.platform_settings where key = 'ESCROW_PLATFORM_USER_ID';
  if v_platform_user is null then raise exception 'ESCROW platform user missing'; end if;

  v_platform_wallet := public.ensure_wallet(v_platform_user, v_tx.currency);
  v_receiver_wallet := public.ensure_wallet(v_tx.receiver_id, v_tx.currency);

  v_fee := round((coalesce(p_commission_percent,0)/100.0) * v_tx.amount, 2);
  if v_fee < 0 then v_fee := 0; end if;
  v_net := v_tx.amount - v_fee;
  if v_net < 0 then raise exception 'Net amount negative'; end if;

  -- move funds: platform escrow -> receiver, keep fee in platform wallet
  update public.wallets set balance = balance - v_tx.amount, updated_at = now() where id = v_platform_wallet;
  update public.wallets set balance = balance + v_net, updated_at = now() where id = v_receiver_wallet;

  update public.escrow_transactions set status = 'released', updated_at = now() where id = p_escrow_id;
  return true;
end; $$ language plpgsql security definer set search_path = public;

-- RPC: refund escrow back to payer
create or replace function public.refund_escrow(p_escrow_id uuid) returns boolean as $$
declare
  v_tx record;
  v_platform_user uuid;
  v_platform_wallet uuid;
  v_payer_wallet uuid;
begin
  select * into v_tx from public.escrow_transactions where id = p_escrow_id and status in ('pending','dispute');
  if not found then raise exception 'Escrow not refundable'; end if;

  select value::uuid into v_platform_user from public.platform_settings where key = 'ESCROW_PLATFORM_USER_ID';
  if v_platform_user is null then raise exception 'ESCROW platform user missing'; end if;

  v_platform_wallet := public.ensure_wallet(v_platform_user, v_tx.currency);
  v_payer_wallet := public.ensure_wallet(v_tx.payer_id, v_tx.currency);

  update public.wallets set balance = balance - v_tx.amount, updated_at = now() where id = v_platform_wallet;
  update public.wallets set balance = balance + v_tx.amount, updated_at = now() where id = v_payer_wallet;

  update public.escrow_transactions set status = 'refunded', updated_at = now() where id = p_escrow_id;
  return true;
end; $$ language plpgsql security definer set search_path = public;

-- RPC: open dispute
create or replace function public.dispute_escrow(p_escrow_id uuid) returns boolean as $$
begin
  update public.escrow_transactions set status = 'dispute', updated_at = now() where id = p_escrow_id and status = 'pending';
  if not found then raise exception 'Cannot dispute'; end if;
  return true;
end; $$ language plpgsql security definer set search_path = public;


