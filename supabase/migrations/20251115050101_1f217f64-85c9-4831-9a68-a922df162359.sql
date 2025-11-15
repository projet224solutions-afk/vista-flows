-- Policies admin pour l'interface PDG/Admin
-- Permet à l'admin d'accéder à toutes les données nécessaires

-- Helper function pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles: Admin peut tout voir
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Wallets: Admin peut tout voir
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets"
ON public.wallets
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Wallet transactions: Admin peut tout voir
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Orders: Admin peut tout voir (en plus des policies existantes)
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_admin());

-- System errors: Admin peut tout voir
DROP POLICY IF EXISTS "Admins can view system errors" ON public.system_errors;
CREATE POLICY "Admins can view system errors"
ON public.system_errors
FOR ALL
TO authenticated
USING (public.is_admin());

-- Products: Policy admin déjà existante mais on s'assure qu'elle fonctionne
DROP POLICY IF EXISTS "Admins full access to products" ON public.products;
CREATE POLICY "Admins full access to products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_admin());
