-- =====================================================
-- CORRECTION DES POLITIQUES RLS POUR SYSTEM_SETTINGS ET PDG_SETTINGS
-- 224SOLUTIONS - 29 Janvier 2026
-- =====================================================
-- Problème: Le PDG ne peut pas modifier les taux de frais
-- Cause: La politique UPDATE exigeait role='admin' mais le PDG peut avoir 'ceo', 'pdg', etc.
-- =====================================================

-- 1. Fonction helper pour vérifier si l'utilisateur est PDG
CREATE OR REPLACE FUNCTION public.is_pdg_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_is_pdg BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier dans pdg_management
  SELECT EXISTS(
    SELECT 1 FROM pdg_management 
    WHERE user_id = v_user_id 
    AND is_active = true
  ) INTO v_is_pdg;
  
  IF v_is_pdg THEN
    RETURN TRUE;
  END IF;
  
  -- Sinon vérifier le rôle dans profiles
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = v_user_id 
    AND role::text IN ('admin', 'ceo', 'pdg', 'PDG', 'CEO', 'ADMIN')
  ) INTO v_is_pdg;
  
  RETURN v_is_pdg;
END;
$$;

-- =====================================================
-- 2. CORRECTION DES POLITIQUES POUR system_settings
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Anyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Only PDG can update system settings" ON system_settings;
DROP POLICY IF EXISTS "PDG can view system settings" ON system_settings;
DROP POLICY IF EXISTS "PDG can update system settings" ON system_settings;
DROP POLICY IF EXISTS "PDG can insert system settings" ON system_settings;
DROP POLICY IF EXISTS "PDG can delete system settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Service role full access to system settings" ON system_settings;

-- Créer les nouvelles politiques complètes

-- SELECT: Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Authenticated users can view system settings"
ON system_settings FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Seul le PDG peut modifier
CREATE POLICY "PDG can update system settings"
ON system_settings FOR UPDATE
TO authenticated
USING (is_pdg_user())
WITH CHECK (is_pdg_user());

-- INSERT: Seul le PDG peut créer
CREATE POLICY "PDG can insert system settings"
ON system_settings FOR INSERT
TO authenticated
WITH CHECK (is_pdg_user());

-- DELETE: Seul le PDG peut supprimer
CREATE POLICY "PDG can delete system settings"
ON system_settings FOR DELETE
TO authenticated
USING (is_pdg_user());

-- Politique pour service_role (backend)
CREATE POLICY "Service role full access to system settings"
ON system_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 3. CORRECTION DES POLITIQUES POUR pdg_settings
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can view pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "Admins can update pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "Admins can insert pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "PDG can view pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "PDG can update pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "PDG can insert pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "PDG can delete pdg_settings" ON pdg_settings;
DROP POLICY IF EXISTS "Service role full access to pdg_settings" ON pdg_settings;

-- Créer les nouvelles politiques

-- SELECT: PDG peut lire
CREATE POLICY "PDG can view pdg_settings"
ON pdg_settings FOR SELECT
TO authenticated
USING (is_pdg_user());

-- UPDATE: PDG peut modifier
CREATE POLICY "PDG can update pdg_settings"
ON pdg_settings FOR UPDATE
TO authenticated
USING (is_pdg_user())
WITH CHECK (is_pdg_user());

-- INSERT: PDG peut créer
CREATE POLICY "PDG can insert pdg_settings"
ON pdg_settings FOR INSERT
TO authenticated
WITH CHECK (is_pdg_user());

-- DELETE: PDG peut supprimer
CREATE POLICY "PDG can delete pdg_settings"
ON pdg_settings FOR DELETE
TO authenticated
USING (is_pdg_user());

-- Politique pour service_role (backend)
CREATE POLICY "Service role full access to pdg_settings"
ON pdg_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- 4. Grant execute sur la fonction helper
-- =====================================================
GRANT EXECUTE ON FUNCTION is_pdg_user() TO authenticated, service_role;

-- =====================================================
-- 5. Assurer que RLS est activé sur les deux tables
-- =====================================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdg_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. Commentaires
-- =====================================================
COMMENT ON FUNCTION is_pdg_user IS 'Vérifie si l''utilisateur actuel est un PDG (via pdg_management ou rôle admin/ceo)';
