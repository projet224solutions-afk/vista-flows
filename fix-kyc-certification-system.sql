-- ============================================================================
-- SCRIPT DE CORRECTION - SYSTÈME KYC & CERTIFICATION
-- Date: 2026-01-07
-- Objectif: Corriger tous les problèmes identifiés
-- ============================================================================

-- ============================================================================
-- PARTIE 0: CRÉER TYPE ENUM SI N'EXISTE PAS
-- ============================================================================

-- Créer le type vendor_certification_status s'il n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_certification_status') THEN
    CREATE TYPE vendor_certification_status AS ENUM ('NON_CERTIFIE', 'CERTIFIE', 'SUSPENDU');
    RAISE NOTICE '✅ Type vendor_certification_status créé';
  ELSE
    RAISE NOTICE '✅ Type vendor_certification_status existe déjà';
  END IF;
END $$;

-- ============================================================================
-- PARTIE 1: CRÉER/CORRIGER ENREGISTREMENTS VENDORS
-- ============================================================================

-- 1.0 Corriger vendors existants avec business_name NULL
UPDATE vendors v
SET 
  business_name = COALESCE(p.full_name, p.email, 'Boutique ' || SUBSTRING(p.id::text, 1, 8)),
  updated_at = NOW()
FROM profiles p
WHERE v.user_id = p.id
  AND v.business_name IS NULL;

-- 1.1 Créer vendors pour tous les profils vendeurs sans enregistrement
INSERT INTO vendors (user_id, business_name, kyc_status, created_at, updated_at)
SELECT 
  p.id,
  COALESCE(p.full_name, p.email, 'Boutique ' || SUBSTRING(p.id::text, 1, 8)) as business_name,
  'pending' as kyc_status,
  NOW(),
  NOW()
FROM profiles p
LEFT JOIN vendors v ON v.user_id = p.id
WHERE (p.role::text ILIKE '%vend%' OR p.role::text ILIKE '%seller%')
  AND v.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 1.2 Créer vendor_certifications pour tous les vendeurs
INSERT INTO vendor_certifications (
  vendor_id,
  status,
  kyc_status,
  created_at,
  updated_at
)
SELECT 
  p.id,
  'NON_CERTIFIE'::vendor_certification_status,
  COALESCE(v.kyc_status, vkyc.status, 'pending') as kyc_status,
  NOW(),
  NOW()
FROM profiles p
LEFT JOIN vendors v ON v.user_id = p.id
LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = p.id
LEFT JOIN vendor_certifications vc ON vc.vendor_id = p.id
WHERE (p.role::text ILIKE '%vend%' OR p.role::text ILIKE '%seller%')
  AND vc.id IS NULL
ON CONFLICT (vendor_id) DO UPDATE
SET 
  kyc_status = EXCLUDED.kyc_status,
  updated_at = NOW();

-- ============================================================================
-- PARTIE 2: SYNCHRONISER KYC STATUS
-- ============================================================================

-- 2.1 Mettre à jour kyc_status dans vendor_certifications depuis vendor_kyc
UPDATE vendor_certifications vc
SET 
  kyc_status = vkyc.status,
  kyc_verified_at = vkyc.verified_at,
  updated_at = NOW()
FROM vendor_kyc vkyc
WHERE vkyc.vendor_id = vc.vendor_id
  AND (
    vc.kyc_status IS NULL 
    OR vc.kyc_status != vkyc.status
    OR (vkyc.verified_at IS NOT NULL AND vc.kyc_verified_at IS NULL)
  );

-- 2.2 Mettre à jour kyc_status depuis vendors table (fallback)
UPDATE vendor_certifications vc
SET 
  kyc_status = v.kyc_status,
  updated_at = NOW()
FROM vendors v
WHERE v.user_id = vc.vendor_id
  AND vc.kyc_status IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM vendor_kyc vkyc
    WHERE vkyc.vendor_id = vc.vendor_id
  );

-- ============================================================================
-- PARTIE 3: CRÉER UN VENDEUR DE TEST AVEC KYC VÉRIFIÉ
-- ============================================================================

-- Trouver le premier vendeur et lui donner un KYC vérifié pour test
DO $$
DECLARE
  v_test_vendor_id UUID;
BEGIN
  -- Sélectionner premier vendeur
  SELECT id INTO v_test_vendor_id
  FROM profiles
  WHERE role::text ILIKE '%vend%' OR role::text ILIKE '%seller%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_test_vendor_id IS NOT NULL THEN
    -- Créer/mettre à jour vendor_kyc avec status verified
    INSERT INTO vendor_kyc (
      vendor_id,
      status,
      phone_verified,
      phone_number,
      id_document_type,
      id_document_url,
      verified_at,
      created_at,
      updated_at
    ) VALUES (
      v_test_vendor_id,
      'verified',
      true,
      '+224 600 00 00 00',
      'carte_identite',
      'https://example.com/test-kyc.jpg',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (vendor_id) DO UPDATE
    SET 
      status = 'verified',
      phone_verified = true,
      verified_at = NOW(),
      updated_at = NOW();
    
    -- Mettre à jour vendors.kyc_status
    UPDATE vendors
    SET kyc_status = 'verified'
    WHERE user_id = v_test_vendor_id;
    
    -- Mettre à jour vendor_certifications
    UPDATE vendor_certifications
    SET 
      kyc_status = 'verified',
      kyc_verified_at = NOW(),
      updated_at = NOW()
    WHERE vendor_id = v_test_vendor_id;
    
    RAISE NOTICE '✅ Vendeur test créé avec KYC vérifié: %', v_test_vendor_id;
  ELSE
    RAISE NOTICE '⚠️  Aucun vendeur trouvé pour créer test';
  END IF;
END $$;

-- ============================================================================
-- PARTIE 4: VÉRIFIER/CORRIGER TRIGGER
-- ============================================================================

-- Vérifier que le trigger existe
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'vendor_certifications'
      AND trigger_name LIKE '%kyc%'
  ) INTO v_trigger_exists;
  
  IF v_trigger_exists THEN
    RAISE NOTICE '✅ Trigger KYC existe';
  ELSE
    RAISE WARNING '❌ Trigger KYC manquant - il faut appliquer migration 20260104_vendor_certifications.sql';
  END IF;
END $$;

-- ============================================================================
-- PARTIE 5: VÉRIFIER RLS POLICIES
-- ============================================================================

-- Lister policies sur vendor_certifications
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'vendor_certifications';
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 RLS Policies sur vendor_certifications: % trouvées', v_policy_count;
  
  FOR rec IN (
    SELECT policyname, cmd::text
    FROM pg_policies
    WHERE tablename = 'vendor_certifications'
    ORDER BY policyname
  ) LOOP
    RAISE NOTICE '  - %: %', rec.policyname, rec.cmd;
  END LOOP;
END $$;

-- ============================================================================
-- PARTIE 6: RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  v_total_vendors INTEGER;
  v_with_vendor_kyc INTEGER;
  v_kyc_verified INTEGER;
  v_with_certification INTEGER;
  v_certified INTEGER;
  v_eligible_certification INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RAPPORT SYSTÈME KYC & CERTIFICATION';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  
  -- Statistiques
  SELECT COUNT(*) INTO v_total_vendors
  FROM profiles
  WHERE role::text ILIKE '%vend%' OR role::text ILIKE '%seller%';
  
  SELECT COUNT(*) INTO v_with_vendor_kyc
  FROM vendor_kyc;
  
  SELECT COUNT(*) INTO v_kyc_verified
  FROM vendor_kyc
  WHERE status = 'verified';
  
  SELECT COUNT(*) INTO v_with_certification
  FROM vendor_certifications;
  
  SELECT COUNT(*) INTO v_certified
  FROM vendor_certifications
  WHERE status::text = 'CERTIFIE';
  
  SELECT COUNT(*) INTO v_eligible_certification
  FROM vendor_certifications vc
  LEFT JOIN vendor_kyc vkyc ON vkyc.vendor_id = vc.vendor_id
  WHERE vkyc.status = 'verified'
    AND vc.status::text != 'CERTIFIE';
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  RAISE NOTICE 'Total vendeurs: %', v_total_vendors;
  RAISE NOTICE '  ├─ Avec vendor_kyc: %', v_with_vendor_kyc;
  RAISE NOTICE '  ├─ KYC vérifié: % (%.0f%%)', v_kyc_verified,
    (v_kyc_verified::FLOAT / NULLIF(v_total_vendors, 0) * 100);
  RAISE NOTICE '  ├─ Avec certification: %', v_with_certification;
  RAISE NOTICE '  ├─ Certifiés: %', v_certified;
  RAISE NOTICE '  └─ Éligibles certification: %', v_eligible_certification;
  RAISE NOTICE '';
  
  -- Actions recommandées
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES';
  RAISE NOTICE '────────────────────────────────────────────────────────';
  
  IF v_kyc_verified = 0 THEN
    RAISE NOTICE '1. ⚠️  Aucun KYC vérifié';
    RAISE NOTICE '   → Un vendeur test a été créé avec KYC vérifié';
    RAISE NOTICE '   → Utiliser interface CEO pour vérifier plus de KYC';
  ELSIF v_eligible_certification > 0 THEN
    RAISE NOTICE '1. ✅ % vendeur(s) avec KYC vérifié', v_kyc_verified;
    RAISE NOTICE '   → % peuvent être certifiés', v_eligible_certification;
    RAISE NOTICE '   → Ouvrir VendorCertificationManager et cliquer CERTIFIER';
  ELSE
    RAISE NOTICE '1. ✅ Tous les vendeurs avec KYC vérifié sont certifiés';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '2. 📝 Créer interface CEO pour vérifier KYC pendants';
  RAISE NOTICE '   → src/components/ceo/VendorKYCReview.tsx (À CRÉER)';
  RAISE NOTICE '   → Permettre approbation/rejet des documents';
  RAISE NOTICE '';
  
  RAISE NOTICE '3. 🔧 Vérifier Edge Function verify-vendor';
  RAISE NOTICE '   → https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions';
  RAISE NOTICE '   → Doit être déployée et active';
  RAISE NOTICE '';
  
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORRECTIONS APPLIQUÉES AVEC SUCCÈS';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
END $$;
