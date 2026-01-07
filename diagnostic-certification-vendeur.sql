-- ============================================================================
-- DIAGNOSTIC: Pourquoi la certification vendeur ne fonctionne pas?
-- ============================================================================

-- 1. Vérifier si la table vendor_certifications existe
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_certifications') 
    THEN '✅ Table existe'
    ELSE '❌ Table manquante'
  END as statut
FROM information_schema.tables
WHERE table_name = 'vendor_certifications'
LIMIT 1;

-- 2. Vérifier les vendeurs et leur KYC
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  v.kyc_status as vendor_kyc_status,
  vkyc.status as vendor_kyc_table_status,
  vc.status as certification_status,
  CASE 
    WHEN v.kyc_status = 'verified' OR vkyc.status = 'verified' THEN '✅ KYC OK'
    WHEN v.kyc_status IS NULL AND vkyc.status IS NULL THEN '❌ Pas de KYC'
    ELSE '⚠️ KYC: ' || COALESCE(v.kyc_status, vkyc.status, 'unknown')
  END as diagnostic
FROM profiles p
LEFT JOIN vendors v ON v.user_id = p.id
LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
LEFT JOIN vendor_certifications vc ON vc.vendor_id = p.id
WHERE p.role IN ('vendeur', 'VENDOR')
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Vérifier le rôle de l'utilisateur qui tente de certifier
SELECT 
  id,
  email,
  role,
  CASE 
    WHEN role IN ('PDG', 'CEO', 'SUPER_ADMIN', 'admin', 'ceo') THEN '✅ Autorisé à certifier'
    ELSE '❌ Non autorisé (rôle: ' || role || ')'
  END as autorisation
FROM profiles
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
LIMIT 1;

-- 4. Vérifier les RLS sur vendor_certifications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'vendor_certifications'
ORDER BY policyname;

-- 5. Compter les vendeurs par statut de certification
SELECT 
  COALESCE(vc.status, 'NON_CERTIFIE') as statut,
  COUNT(*) as nombre
FROM profiles p
LEFT JOIN vendor_certifications vc ON vc.vendor_id = p.id
WHERE p.role IN ('vendeur', 'VENDOR')
GROUP BY COALESCE(vc.status, 'NON_CERTIFIE')
ORDER BY nombre DESC;

-- 6. Vérifier si vendor_certifications a les bonnes colonnes
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_certifications'
ORDER BY ordinal_position;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_vendors_count INTEGER;
  v_kyc_verified_count INTEGER;
  v_certified_count INTEGER;
BEGIN
  -- Vérifier table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'vendor_certifications'
  ) INTO v_table_exists;
  
  -- Compter vendeurs
  SELECT COUNT(*) INTO v_vendors_count
  FROM profiles
  WHERE role IN ('vendeur', 'VENDOR');
  
  -- Compter KYC vérifiés
  SELECT COUNT(DISTINCT p.id) INTO v_kyc_verified_count
  FROM profiles p
  LEFT JOIN vendors v ON v.user_id = p.id
  LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
  WHERE p.role IN ('vendeur', 'VENDOR')
    AND (v.kyc_status = 'verified' OR vkyc.status = 'verified');
  
  -- Compter certifiés
  SELECT COUNT(*) INTO v_certified_count
  FROM vendor_certifications
  WHERE status = 'CERTIFIE';
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'DIAGNOSTIC CERTIFICATION VENDEUR';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table vendor_certifications: %', CASE WHEN v_table_exists THEN '✅ Existe' ELSE '❌ Manquante' END;
  RAISE NOTICE 'Total vendeurs: %', v_vendors_count;
  RAISE NOTICE 'Vendeurs avec KYC vérifié: %', v_kyc_verified_count;
  RAISE NOTICE 'Vendeurs certifiés: %', v_certified_count;
  RAISE NOTICE '';
  
  IF NOT v_table_exists THEN
    RAISE NOTICE '❌ PROBLÈME: Table vendor_certifications manquante';
    RAISE NOTICE '   → Créer la table avec fix-vendor-certification.sql';
  ELSIF v_kyc_verified_count = 0 THEN
    RAISE NOTICE '❌ PROBLÈME: Aucun vendeur avec KYC vérifié';
    RAISE NOTICE '   → Les vendeurs doivent avoir kyc_status = "verified"';
    RAISE NOTICE '   → Vérifier tables: vendors.kyc_status ou vendor_kyc.status';
  ELSE
    RAISE NOTICE '✅ Configuration correcte';
    RAISE NOTICE '   → Vérifier les logs Edge Function pour erreur précise';
  END IF;
  
  RAISE NOTICE '==========================================';
END $$;
