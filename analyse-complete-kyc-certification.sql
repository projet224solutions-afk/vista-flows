-- ============================================================================
-- ANALYSE COMPLÈTE SYSTÈME KYC & CERTIFICATION
-- Date: 2026-01-07
-- Objectif: Vérifier cohérence et identifier tous les problèmes
-- ============================================================================

-- ============================================================================
-- PARTIE 1: STRUCTURE DES TABLES
-- ============================================================================

-- 1.1 Vérifier existence tables KYC
SELECT 
  table_name,
  '✅ Existe' as statut
FROM information_schema.tables
WHERE table_name IN ('vendors', 'vendor_kyc', 'vendor_certifications')
ORDER BY table_name;

-- 1.2 Colonnes de la table vendors (pour KYC)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vendors'
  AND column_name ILIKE '%kyc%'
ORDER BY ordinal_position;

-- 1.3 Colonnes de vendor_kyc
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_kyc'
ORDER BY ordinal_position;

-- 1.4 Colonnes de vendor_certifications
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_certifications'
ORDER BY ordinal_position;

-- ============================================================================
-- PARTIE 2: DONNÉES ACTUELLES
-- ============================================================================

-- 2.1 État KYC de tous les vendeurs
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role::text as role,
  v.kyc_status as vendors_kyc_status,
  vkyc.status as vendor_kyc_status,
  vc.status as certification_status,
  CASE 
    WHEN v.kyc_status = 'verified' OR vkyc.status = 'verified' THEN '✅ KYC Vérifié'
    WHEN v.kyc_status = 'pending' OR vkyc.status = 'pending' THEN '⏳ KYC En attente'
    WHEN v.kyc_status = 'rejected' OR vkyc.status = 'rejected' THEN '❌ KYC Rejeté'
    WHEN v.kyc_status IS NULL AND vkyc.status IS NULL THEN '⚠️ Pas de KYC'
    ELSE '❓ Statut inconnu'
  END as diagnostic_kyc,
  CASE
    WHEN vc.status::text = 'CERTIFIE' THEN '✅ Certifié'
    WHEN vc.status::text = 'SUSPENDU' THEN '🔒 Suspendu'
    WHEN vc.status::text = 'NON_CERTIFIE' THEN '⏸️ Non certifié'
    WHEN vc.status IS NULL THEN '⚠️ Pas de certification'
    ELSE '❓ Statut inconnu'
  END as diagnostic_certification
FROM profiles p
LEFT JOIN vendors v ON v.user_id = p.id
LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
LEFT JOIN vendor_certifications vc ON vc.vendor_id = p.id
WHERE p.role::text ILIKE '%vend%' OR p.role::text ILIKE '%seller%'
ORDER BY p.created_at DESC;

-- 2.2 Statistiques globales
SELECT 
  'Total vendeurs' as metrique,
  COUNT(*) as nombre
FROM profiles
WHERE role::text ILIKE '%vend%' OR role::text ILIKE '%seller%'

UNION ALL

SELECT 
  'Avec enregistrement vendors',
  COUNT(DISTINCT v.user_id)
FROM vendors v

UNION ALL

SELECT 
  'Avec KYC dans vendor_kyc',
  COUNT(*)
FROM vendor_kyc

UNION ALL

SELECT 
  'KYC vérifié (vendors.kyc_status)',
  COUNT(*)
FROM vendors
WHERE kyc_status = 'verified'

UNION ALL

SELECT 
  'KYC vérifié (vendor_kyc.status)',
  COUNT(*)
FROM vendor_kyc
WHERE status = 'verified'

UNION ALL

SELECT 
  'Avec certification',
  COUNT(*)
FROM vendor_certifications

UNION ALL

SELECT 
  'Certifiés',
  COUNT(*)
FROM vendor_certifications
WHERE status::text = 'CERTIFIE'

UNION ALL

SELECT 
  'Suspendus',
  COUNT(*)
FROM vendor_certifications
WHERE status::text = 'SUSPENDU';

-- ============================================================================
-- PARTIE 3: PROBLÈMES DE COHÉRENCE
-- ============================================================================

-- 3.1 Vendeurs SANS enregistrement dans table vendors
SELECT 
  'Vendeurs sans enregistrement vendors' as probleme,
  p.id,
  p.full_name,
  p.email
FROM profiles p
LEFT JOIN vendors v ON v.user_id = p.id
WHERE (p.role::text ILIKE '%vend%' OR p.role::text ILIKE '%seller%')
  AND v.id IS NULL;

-- 3.2 Vendeurs avec enregistrement vendors MAIS sans vendor_kyc
SELECT 
  'Vendeurs sans KYC' as probleme,
  p.id,
  p.full_name,
  v.kyc_status as vendors_kyc_status
FROM profiles p
INNER JOIN vendors v ON v.user_id = p.id
LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
WHERE vkyc.id IS NULL;

-- 3.3 Vendeurs avec KYC verified MAIS sans certification
SELECT 
  'KYC vérifié mais pas certifié' as probleme,
  p.id,
  p.full_name,
  COALESCE(v.kyc_status, vkyc.status) as kyc_status
FROM profiles p
LEFT JOIN vendors v ON v.user_id = p.id
LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
LEFT JOIN vendor_certifications vc ON vc.vendor_id = p.id
WHERE (v.kyc_status = 'verified' OR vkyc.status = 'verified')
  AND (vc.status IS NULL OR vc.status::text = 'NON_CERTIFIE');

-- 3.4 Certifications SANS KYC vérifié (ERREUR CRITIQUE)
SELECT 
  'CRITIQUE: Certifié sans KYC' as probleme,
  p.id,
  p.full_name,
  vc.status as certification_status,
  v.kyc_status as vendors_kyc_status,
  vkyc.status as vendor_kyc_status
FROM vendor_certifications vc
INNER JOIN profiles p ON p.id = vc.vendor_id
LEFT JOIN vendors v ON v.user_id = vc.vendor_id
LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = vc.vendor_id
WHERE vc.status::text = 'CERTIFIE'
  AND COALESCE(v.kyc_status, vkyc.status) != 'verified';

-- ============================================================================
-- PARTIE 4: TRIGGERS ET FONCTIONS
-- ============================================================================

-- 4.1 Vérifier trigger KYC avant certification
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'vendor_certifications'
ORDER BY trigger_name;

-- 4.2 Vérifier fonction check_vendor_kyc_before_certification
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%kyc%'
  OR routine_name LIKE '%certif%'
ORDER BY routine_name;

-- ============================================================================
-- PARTIE 5: POLITIQUES RLS
-- ============================================================================

-- 5.1 Policies sur vendor_kyc
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 50) as condition_courte
FROM pg_policies
WHERE tablename = 'vendor_kyc'
ORDER BY policyname;

-- 5.2 Policies sur vendor_certifications
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 50) as condition_courte
FROM pg_policies
WHERE tablename = 'vendor_certifications'
ORDER BY policyname;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  v_total_vendors INTEGER;
  v_with_vendors_table INTEGER;
  v_with_vendor_kyc INTEGER;
  v_kyc_verified_vendors INTEGER;
  v_kyc_verified_vendor_kyc INTEGER;
  v_with_certification INTEGER;
  v_certified INTEGER;
  v_problem_no_vendors INTEGER;
  v_problem_no_kyc INTEGER;
  v_problem_verified_not_certified INTEGER;
  v_problem_certified_no_kyc INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RAPPORT SYSTÈME KYC & CERTIFICATION';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Compter vendeurs
  SELECT COUNT(*) INTO v_total_vendors
  FROM profiles
  WHERE role::text ILIKE '%vend%' OR role::text ILIKE '%seller%';
  
  SELECT COUNT(DISTINCT v.user_id) INTO v_with_vendors_table
  FROM vendors v
  INNER JOIN profiles p ON p.id = v.user_id
  WHERE p.role::text ILIKE '%vend%' OR p.role::text ILIKE '%seller%';
  
  SELECT COUNT(*) INTO v_with_vendor_kyc
  FROM vendor_kyc;
  
  SELECT COUNT(*) INTO v_kyc_verified_vendors
  FROM vendors
  WHERE kyc_status = 'verified';
  
  SELECT COUNT(*) INTO v_kyc_verified_vendor_kyc
  FROM vendor_kyc
  WHERE status = 'verified';
  
  SELECT COUNT(*) INTO v_with_certification
  FROM vendor_certifications;
  
  SELECT COUNT(*) INTO v_certified
  FROM vendor_certifications
  WHERE status::text = 'CERTIFIE';
  
  -- Compter problèmes
  SELECT COUNT(*) INTO v_problem_no_vendors
  FROM profiles p
  LEFT JOIN vendors v ON v.user_id = p.id
  WHERE (p.role::text ILIKE '%vend%' OR p.role::text ILIKE '%seller%')
    AND v.id IS NULL;
  
  SELECT COUNT(*) INTO v_problem_no_kyc
  FROM profiles p
  INNER JOIN vendors v ON v.user_id = p.id
  LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
  WHERE vkyc.id IS NULL;
  
  SELECT COUNT(*) INTO v_problem_verified_not_certified
  FROM profiles p
  LEFT JOIN vendors v ON v.user_id = p.id
  LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
  LEFT JOIN vendor_certifications vc ON vc.vendor_id = p.id
  WHERE (v.kyc_status = 'verified' OR vkyc.status = 'verified')
    AND (vc.status IS NULL OR vc.status::text = 'NON_CERTIFIE');
  
  SELECT COUNT(*) INTO v_problem_certified_no_kyc
  FROM vendor_certifications vc
  LEFT JOIN vendors v ON v.user_id = vc.vendor_id
  LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = vc.vendor_id
  WHERE vc.status::text = 'CERTIFIE'
    AND COALESCE(v.kyc_status, vkyc.status) != 'verified';
  
  -- Afficher rapport
  RAISE NOTICE '📈 STATISTIQUES';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE 'Total vendeurs: %', v_total_vendors;
  RAISE NOTICE '  ├─ Avec enregistrement vendors: % (%.0f%%)', v_with_vendors_table, 
    (v_with_vendors_table::FLOAT / NULLIF(v_total_vendors, 0) * 100);
  RAISE NOTICE '  ├─ Avec vendor_kyc: % (%.0f%%)', v_with_vendor_kyc,
    (v_with_vendor_kyc::FLOAT / NULLIF(v_total_vendors, 0) * 100);
  RAISE NOTICE '  ├─ KYC vérifié (vendors): %', v_kyc_verified_vendors;
  RAISE NOTICE '  ├─ KYC vérifié (vendor_kyc): %', v_kyc_verified_vendor_kyc;
  RAISE NOTICE '  ├─ Avec certification: %', v_with_certification;
  RAISE NOTICE '  └─ Certifiés: %', v_certified;
  RAISE NOTICE '';
  
  RAISE NOTICE '⚠️  PROBLÈMES DÉTECTÉS';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE 'Vendeurs sans enregistrement vendors: %', v_problem_no_vendors;
  RAISE NOTICE 'Vendeurs sans vendor_kyc: %', v_problem_no_kyc;
  RAISE NOTICE 'KYC vérifié mais pas certifié: %', v_problem_verified_not_certified;
  RAISE NOTICE '🚨 CRITIQUE - Certifié sans KYC: %', v_problem_certified_no_kyc;
  RAISE NOTICE '';
  
  -- Diagnostic final
  IF v_problem_certified_no_kyc > 0 THEN
    RAISE NOTICE '❌ SYSTÈME COMPROMIS';
    RAISE NOTICE '   → Des vendeurs sont certifiés sans KYC vérifié!';
    RAISE NOTICE '   → Trigger check_vendor_kyc_before_certification ne fonctionne pas';
    RAISE NOTICE '   → Action: Vérifier trigger et révoquer certifications invalides';
  ELSIF v_problem_no_vendors > 0 OR v_problem_no_kyc > v_total_vendors * 0.5 THEN
    RAISE NOTICE '⚠️  DONNÉES INCOMPLÈTES';
    RAISE NOTICE '   → Beaucoup de vendeurs sans enregistrements complets';
    RAISE NOTICE '   → Action: Créer enregistrements manquants';
  ELSIF v_problem_verified_not_certified > 0 THEN
    RAISE NOTICE '✅ SYSTÈME FONCTIONNEL';
    RAISE NOTICE '   → Quelques vendeurs avec KYC vérifié peuvent être certifiés';
    RAISE NOTICE '   → Action: Les certifier manuellement via interface PDG';
  ELSE
    RAISE NOTICE '✅ SYSTÈME PARFAIT';
    RAISE NOTICE '   → Aucun problème détecté';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
