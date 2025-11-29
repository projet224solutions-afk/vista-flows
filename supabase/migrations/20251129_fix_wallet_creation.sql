-- Migration: Fix wallet creation (20251129)
-- Objectif: Créer une fonction RPC sécurisée pour initialiser les wallets

-- 1. Créer la fonction RPC qui contourne les RLS
DROP FUNCTION IF EXISTS public.create_user_wallet(UUID);

CREATE FUNCTION public.create_user_wallet(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  balance NUMERIC,
  currency TEXT,
  wallet_status TEXT,
  created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Vérifier que l'utilisateur existe dans auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % does not exist', p_user_id;
  END IF;

  -- Vérifier si le wallet existe déjà
  IF EXISTS (SELECT 1 FROM wallets WHERE user_id = p_user_id) THEN
    RETURN QUERY SELECT 
      wallets.id,
      wallets.user_id,
      wallets.balance,
      wallets.currency,
      wallets.wallet_status,
      wallets.created_at
    FROM wallets 
    WHERE wallets.user_id = p_user_id;
    RETURN;
  END IF;

  -- Créer le wallet
  RETURN QUERY
  INSERT INTO wallets (user_id, balance, currency, wallet_status)
  VALUES (p_user_id, 0, 'GNF', 'active')
  RETURNING 
    wallets.id,
    wallets.user_id,
    wallets.balance,
    wallets.currency,
    wallets.wallet_status,
    wallets.created_at;
END;
$$;

-- 2. Permissions d'exécution
GRANT EXECUTE ON FUNCTION public.create_user_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_wallet(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_wallet(UUID) TO service_role;

-- 3. Simplifier les RLS pour wallets (garder seulement les essentielles)
-- Supprimer les policies compliquées
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view other wallets for transfers" ON public.wallets;
DROP POLICY IF EXISTS "Service role can manage all wallets" ON public.wallets;
DROP POLICY IF EXISTS "PDG can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "PDG can manage all wallets" ON public.wallets;
DROP POLICY IF EXISTS "service_role_all_wallets" ON public.wallets;
DROP POLICY IF EXISTS "Admins full access to wallets" ON public.wallets;
DROP POLICY IF EXISTS "service_role_wallets" ON public.wallets;

-- Créer des policies simples et claires
CREATE POLICY "users_view_own_wallet" ON public.wallets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_wallet" ON public.wallets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "service_role_full_access" ON public.wallets
USING (auth.role() = 'service_role');

COMMENT ON FUNCTION public.create_user_wallet IS 'RPC sécurisée pour créer un wallet utilisateur. Contourne les RLS via SECURITY DEFINER.';
