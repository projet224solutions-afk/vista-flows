-- ============================================================================
-- CORRECTION: Système de certification vendeur
-- ============================================================================

-- ÉTAPE 1: Créer la table vendor_certifications si manquante
CREATE TABLE IF NOT EXISTS vendor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NON_CERTIFIE' CHECK (status IN ('CERTIFIE', 'SUSPENDU', 'NON_CERTIFIE')),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  kyc_verified_at TIMESTAMPTZ,
  kyc_status TEXT,
  last_status_change TIMESTAMPTZ DEFAULT NOW(),
  internal_notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vendor_certifications_vendor ON vendor_certifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_certifications_status ON vendor_certifications(status);

-- ÉTAPE 2: Activer RLS
ALTER TABLE vendor_certifications ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 3: Supprimer anciennes policies (si existent)
DROP POLICY IF EXISTS "Lecture certifications publique" ON vendor_certifications;
DROP POLICY IF EXISTS "Lecture certifications vendeurs" ON vendor_certifications;
DROP POLICY IF EXISTS "Modification PDG seulement" ON vendor_certifications;
DROP POLICY IF EXISTS "Vendeurs voient leur propre certification" ON vendor_certifications;

-- ÉTAPE 4: Créer nouvelles policies RLS
-- Lecture: Tout le monde peut voir les certifications
CREATE POLICY "Lecture certifications publique" 
  ON vendor_certifications FOR SELECT 
  USING (true);

-- Modification: Seulement PDG/admin
CREATE POLICY "Modification PDG seulement" 
  ON vendor_certifications FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
        AND role IN ('PDG', 'CEO', 'SUPER_ADMIN', 'admin', 'ceo')
    )
  );

-- ÉTAPE 5: Créer les certifications par défaut pour vendeurs existants
INSERT INTO vendor_certifications (vendor_id, status)
SELECT 
  p.id,
  'NON_CERTIFIE'
FROM profiles p
WHERE p.role IN ('vendeur', 'VENDOR')
  AND NOT EXISTS (
    SELECT 1 FROM vendor_certifications vc WHERE vc.vendor_id = p.id
  )
ON CONFLICT (vendor_id) DO NOTHING;

-- ÉTAPE 6: Mettre à jour kyc_status depuis autres tables
-- De vendors.kyc_status
UPDATE vendor_certifications vc
SET kyc_status = v.kyc_status,
    kyc_verified_at = CASE WHEN v.kyc_status = 'verified' THEN NOW() ELSE NULL END
FROM vendors v
WHERE v.user_id = vc.vendor_id
  AND v.kyc_status IS NOT NULL
  AND vc.kyc_status IS NULL;

-- De vendor_kyc.status
UPDATE vendor_certifications vc
SET kyc_status = vkyc.status,
    kyc_verified_at = vkyc.verified_at
FROM vendor_kyc vkyc
WHERE vkyc.vendor_id = vc.vendor_id
  AND vkyc.status = 'verified'
  AND vc.kyc_status IS NULL;

-- ÉTAPE 7: Vérifier Edge Function verify-vendor existe
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'CORRECTION CERTIFICATION VENDEUR TERMINÉE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table vendor_certifications créée/vérifiée';
  RAISE NOTICE '✅ RLS configuré correctement';
  RAISE NOTICE '✅ Certifications par défaut créées';
  RAISE NOTICE '✅ KYC status synchronisé';
  RAISE NOTICE '';
  RAISE NOTICE 'PROCHAINE ÉTAPE:';
  RAISE NOTICE '1. Vérifier que Edge Function verify-vendor est déployée:';
  RAISE NOTICE '   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions';
  RAISE NOTICE '';
  RAISE NOTICE '2. Si non déployée, deployer avec:';
  RAISE NOTICE '   supabase functions deploy verify-vendor';
  RAISE NOTICE '';
  RAISE NOTICE '3. Tester la certification depuis interface PDG';
  RAISE NOTICE '==========================================';
END $$;

-- ÉTAPE 8: Rapport final
SELECT 
  'Total vendeurs' as description,
  COUNT(*) as nombre
FROM profiles
WHERE role IN ('vendeur', 'VENDOR')

UNION ALL

SELECT 
  'Avec certification créée' as description,
  COUNT(*) as nombre
FROM vendor_certifications

UNION ALL

SELECT 
  'KYC vérifié' as description,
  COUNT(*) as nombre
FROM vendor_certifications
WHERE kyc_status = 'verified'

UNION ALL

SELECT 
  'Certifiés' as description,
  COUNT(*) as nombre
FROM vendor_certifications
WHERE status = 'CERTIFIE';
