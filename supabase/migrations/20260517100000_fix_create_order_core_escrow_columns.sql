-- ================================================================
-- FIX CRITIQUE : create_order_core échoue silencieusement
-- Cause : la fonction référence des colonnes inexistantes dans
--         escrow_transactions (auto_release_at, payment_method,
--         payer_id, receiver_id, buyer_id, seller_id)
-- Ce script ajoute les colonnes manquantes (idempotent) et remplace
-- create_order_core par une version qui utilise les vrais noms.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Colonnes manquantes dans escrow_transactions
-- ────────────────────────────────────────────────────────────────

-- buyer_id / seller_id (version "propre" du schéma)
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS buyer_id   UUID,
  ADD COLUMN IF NOT EXISTS seller_id  UUID;

-- payer_id / receiver_id (alias auth.users.id, utilisé pour remboursement)
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS payer_id   UUID,
  ADD COLUMN IF NOT EXISTS receiver_id UUID;

-- payment_method (ex : 'wallet', 'card', 'cash')
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- commission_amount si absent (utilisé par attachEscrowToOrders)
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;

-- auto_release_at comme alias de auto_release_date
-- (create_order_core utilisait auto_release_at, la table avait auto_release_date)
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;

-- Synchroniser auto_release_at ← auto_release_date pour les lignes existantes
UPDATE public.escrow_transactions
SET auto_release_at = auto_release_date
WHERE auto_release_at IS NULL
  AND auto_release_date IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 2. Supprimer TOUTES les surcharges de create_order_core
--    (plusieurs signatures coexistaient → CREATE OR REPLACE ambiguë)
-- ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS func_sig
    FROM   pg_proc
    WHERE  proname        = 'create_order_core'
      AND  pronamespace   = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 3. Recréer create_order_core avec les vrais noms de colonnes
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_order_core(
  p_order_number           text,
  p_customer_id            uuid,
  p_vendor_id              uuid,
  p_vendor_user_id         uuid,
  p_payment_method         text,
  p_payment_intent_id      text    DEFAULT NULL,
  p_shipping_address       jsonb   DEFAULT '{}'::jsonb,
  p_currency               text    DEFAULT 'GNF',
  p_items                  jsonb   DEFAULT '[]'::jsonb,
  p_auto_release_days      int     DEFAULT 7,
  p_buyer_user_id          uuid    DEFAULT NULL,
  p_wallet_debit_amount    numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item            jsonb;
  product_id      uuid;
  quantity        int;
  current_stock   int;
  product_price   numeric;
  product_name    text;
  subtotal        numeric := 0;
  order_id        uuid;
  item_records    jsonb   := '[]'::jsonb;
  v_buyer_wallet_id bigint;
  v_release_at    timestamptz;
BEGIN

  -- ====== PHASE 0 : Vérification solde wallet (si paiement wallet) ======
  IF p_payment_method = 'wallet'
     AND p_buyer_user_id IS NOT NULL
     AND p_wallet_debit_amount > 0
  THEN
    PERFORM 1
    FROM public.wallets
    WHERE user_id = p_buyer_user_id
      AND balance >= p_wallet_debit_amount
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error',   'Solde wallet insuffisant pour effectuer cet achat'
      );
    END IF;
  END IF;

  -- ====== PHASE 1 : Valider les produits + verrouiller les lignes ======
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    product_id := (item->>'product_id')::uuid;
    quantity   := (item->>'quantity')::int;

    SELECT p.stock_quantity, p.price, p.name
    INTO   current_stock, product_price, product_name
    FROM   products p
    WHERE  p.id        = product_id
      AND  p.vendor_id = p_vendor_id
      AND  p.is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error',   format('Produit %s introuvable, inactif ou mauvais vendeur', product_id)
      );
    END IF;

    IF current_stock IS NOT NULL AND current_stock < quantity THEN
      RETURN jsonb_build_object(
        'success', false,
        'error',   format('Stock insuffisant pour "%s" : %s disponible, %s demandé', product_name, current_stock, quantity)
      );
    END IF;

    item_records := item_records || jsonb_build_object(
      'product_id',   product_id,
      'product_name', product_name,
      'quantity',     quantity,
      'unit_price',   product_price,
      'total_price',  product_price * quantity,
      'variant_id',   item->>'variant_id'
    );

    subtotal := subtotal + (product_price * quantity);
  END LOOP;

  -- ====== PHASE 2 : Créer la commande ======
  INSERT INTO orders (
    order_number, customer_id, vendor_id, status,
    payment_status, payment_method, payment_intent_id,
    subtotal, total_amount, shipping_address, currency
  ) VALUES (
    p_order_number, p_customer_id, p_vendor_id,
    'pending'::order_status,
    'pending'::payment_status,
    p_payment_method::payment_method, p_payment_intent_id,
    subtotal, subtotal, p_shipping_address, p_currency
  )
  RETURNING id INTO order_id;

  -- ====== PHASE 3 : Insérer les lignes de commande ======
  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, variant_id)
  SELECT
    order_id,
    (r->>'product_id')::uuid,
    r->>'product_name',
    (r->>'quantity')::int,
    (r->>'unit_price')::numeric,
    (r->>'total_price')::numeric,
    NULLIF(r->>'variant_id', '')::uuid
  FROM jsonb_array_elements(item_records) AS r;

  -- ====== PHASE 4 : Décrémenter le stock ======
  UPDATE products p
  SET    stock_quantity = GREATEST(0, COALESCE(p.stock_quantity, 0) - (r->>'quantity')::int),
         updated_at     = now()
  FROM   jsonb_array_elements(item_records) AS r
  WHERE  p.id = (r->>'product_id')::uuid;

  -- ====== PHASE 5 : Créer l'escrow ======
  v_release_at := now() + (p_auto_release_days || ' days')::interval;

  INSERT INTO escrow_transactions (
    order_id,
    buyer_id,
    seller_id,
    payer_id,
    receiver_id,
    amount,
    currency,
    status,
    auto_release_at,
    auto_release_date,
    payment_method
  ) VALUES (
    order_id,
    p_customer_id,       -- customers.id (buyer)
    p_vendor_user_id,    -- auth.users.id (seller)
    p_buyer_user_id,     -- auth.users.id (acheteur pour remboursement)
    p_vendor_user_id,    -- auth.users.id (vendeur)
    subtotal,
    p_currency,
    'held',
    v_release_at,
    v_release_at,        -- auto_release_date = même valeur
    p_payment_method
  );

  -- ====== PHASE 6 : Débit wallet atomique (si paiement wallet) ======
  IF p_payment_method = 'wallet'
     AND p_buyer_user_id IS NOT NULL
     AND p_wallet_debit_amount > 0
  THEN
    UPDATE public.wallets
    SET    balance    = balance - p_wallet_debit_amount,
           updated_at = now()
    WHERE  user_id = p_buyer_user_id;

    SELECT id INTO v_buyer_wallet_id
    FROM   public.wallets
    WHERE  user_id = p_buyer_user_id;

    IF v_buyer_wallet_id IS NOT NULL THEN
      INSERT INTO public.wallet_transactions (
        sender_wallet_id,
        receiver_wallet_id,
        transaction_type,
        amount,
        description,
        status,
        metadata
      ) VALUES (
        v_buyer_wallet_id,
        v_buyer_wallet_id,
        'marketplace_purchase',
        p_wallet_debit_amount,
        'Paiement commande marketplace — Fonds bloqués en Escrow',
        'completed',
        jsonb_build_object(
          'order_id',       order_id,
          'currency',       p_currency,
          'product_amount', subtotal,
          'total_debited',  p_wallet_debit_amount,
          'source',         'create_order_core'
        )
      );
    END IF;
  END IF;

  -- ====== SUCCESS ======
  RETURN jsonb_build_object(
    'success',      true,
    'order_id',     order_id,
    'order_number', p_order_number,
    'subtotal',     subtotal,
    'total_amount', subtotal,
    'currency',     p_currency,
    'items',        item_records,
    'escrow_status','held'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.create_order_core(text,uuid,uuid,uuid,text,text,jsonb,text,jsonb,int,uuid,numeric) IS
  'Création atomique commande + items + décrément stock + escrow + débit wallet optionnel. Corrigé : colonnes escrow (auto_release_at, auto_release_date, payment_method, buyer_id, seller_id, payer_id, receiver_id).';

-- Vérification
SELECT 'create_order_core mis à jour — colonnes escrow corrigées.' AS status;
