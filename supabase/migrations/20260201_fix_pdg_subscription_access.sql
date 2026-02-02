-- =======================================================================
-- FIX: Permettre au PDG d'offrir des abonnements taxi/moto
-- =======================================================================
-- Problème: Les policies RLS vérifient 'admin' et 'ceo' mais pas 'pdg'
-- Solution: Ajouter 'pdg' aux vérifications de rôle
-- =======================================================================

-- 1. Supprimer les anciennes policies
DROP POLICY IF EXISTS "admin_manage_all_subscriptions" ON public.driver_subscriptions;
DROP POLICY IF EXISTS "admin_manage_config" ON public.driver_subscription_config;
DROP POLICY IF EXISTS "admin_manage_revenues" ON public.driver_subscription_revenues;

-- 2. Recréer les policies avec 'pdg' inclus

-- Policy pour driver_subscriptions
CREATE POLICY "admin_pdg_manage_all_subscriptions" ON public.driver_subscriptions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN')
  )
);

-- Policy pour driver_subscription_config
CREATE POLICY "admin_pdg_manage_config" ON public.driver_subscription_config
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN')
  )
);

-- Policy pour driver_subscription_revenues
CREATE POLICY "admin_pdg_manage_revenues" ON public.driver_subscription_revenues
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role::text IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN')
  )
);

-- 3. Mettre à jour la fonction pdg_offer_subscription pour vérifier les bons rôles
CREATE OR REPLACE FUNCTION pdg_offer_subscription(
  p_user_id UUID,
  p_type TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id UUID;
  v_end_date TIMESTAMPTZ;
  v_admin_role TEXT;
BEGIN
  -- Vérifier que l'appelant est admin/PDG
  SELECT role::text INTO v_admin_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN') THEN
    RAISE EXCEPTION 'Accès refusé. Seul le PDG/Admin peut offrir des abonnements.';
  END IF;

  -- Validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID requis';
  END IF;

  IF p_type NOT IN ('taxi', 'livreur') THEN
    RAISE EXCEPTION 'Type invalide. Doit être taxi ou livreur';
  END IF;

  IF p_days <= 0 OR p_days > 365 THEN
    RAISE EXCEPTION 'Durée invalide. Doit être entre 1 et 365 jours';
  END IF;

  -- Vérifier que l'utilisateur cible existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur cible non trouvé';
  END IF;

  -- Calculer date de fin
  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  -- Désactiver anciens abonnements
  UPDATE driver_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE user_id = p_user_id AND status = 'active';

  -- Créer abonnement gratuit offert par PDG
  INSERT INTO driver_subscriptions (
    user_id, type, price, status, start_date, end_date,
    payment_method, transaction_id, billing_cycle, metadata
  ) VALUES (
    p_user_id, p_type, 0, 'active', NOW(), v_end_date,
    'pdg_gift', 'GIFT-PDG-' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'custom',
    jsonb_build_object(
      'offered_by_pdg', TRUE,
      'offered_by_user_id', auth.uid(),
      'days_offered', p_days,
      'offered_at', NOW()
    )
  ) RETURNING id INTO v_subscription_id;

  RAISE NOTICE 'Abonnement % offert à % pour % jours', p_type, p_user_id, p_days;

  RETURN v_subscription_id;
END;
$$;

-- 4. S'assurer que la contrainte payment_method inclut 'pdg_gift'
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  ALTER TABLE driver_subscriptions DROP CONSTRAINT IF EXISTS driver_subscriptions_payment_method_check;

  -- Créer la nouvelle contrainte avec toutes les valeurs possibles
  ALTER TABLE driver_subscriptions ADD CONSTRAINT driver_subscriptions_payment_method_check
    CHECK (payment_method IN ('wallet', 'mobile_money', 'orange_money', 'mtn_money', 'card', 'cash', 'pdg_gift', 'custom'));

  RAISE NOTICE 'Contrainte payment_method mise à jour avec pdg_gift';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Contrainte payment_method existe déjà ou erreur: %', SQLERRM;
END $$;

-- 5. Accorder les permissions
GRANT EXECUTE ON FUNCTION public.pdg_offer_subscription(UUID, TEXT, INTEGER) TO authenticated;

-- 6. Fonction de test pour vérifier les permissions PDG
CREATE OR REPLACE FUNCTION test_pdg_can_offer_subscription()
RETURNS TABLE(
  test_name TEXT,
  result BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Récupérer le rôle de l'utilisateur actuel
  SELECT role::text INTO v_role FROM profiles WHERE id = auth.uid();

  -- Test 1: Vérifier le rôle
  RETURN QUERY
  SELECT
    'Rôle utilisateur'::TEXT,
    (v_role IS NOT NULL)::BOOLEAN,
    COALESCE('Rôle: ' || v_role, 'Non connecté')::TEXT;

  -- Test 2: Vérifier si admin/PDG
  RETURN QUERY
  SELECT
    'Est Admin/PDG'::TEXT,
    (v_role IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN'))::BOOLEAN,
    CASE
      WHEN v_role IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN') THEN 'Peut offrir des abonnements'
      ELSE 'Ne peut PAS offrir des abonnements'
    END::TEXT;

  -- Test 3: Vérifier les policies
  RETURN QUERY
  SELECT
    'Policies actives'::TEXT,
    (SELECT COUNT(*) > 0 FROM pg_policies WHERE tablename = 'driver_subscriptions')::BOOLEAN,
    (SELECT 'Nombre: ' || COUNT(*)::TEXT FROM pg_policies WHERE tablename = 'driver_subscriptions')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_pdg_can_offer_subscription() TO authenticated;

-- 7. Log de déploiement
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX APPLIQUÉ: PDG peut maintenant offrir des abonnements';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Rôles autorisés: admin, ceo, pdg, PDG, CEO, ADMIN';
  RAISE NOTICE 'Fonction: pdg_offer_subscription(user_id, type, days)';
  RAISE NOTICE 'Test: SELECT * FROM test_pdg_can_offer_subscription();';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;
