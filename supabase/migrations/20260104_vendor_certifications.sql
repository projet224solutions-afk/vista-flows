-- =====================================================
-- VENDOR CERTIFICATION SYSTEM
-- Système de certification vendeur contrôlé par PDG/Admin
-- 224SOLUTIONS
-- =====================================================

-- Type ENUM pour statut certification
CREATE TYPE vendor_certification_status AS ENUM (
  'NON_CERTIFIE',
  'EN_ATTENTE',
  'CERTIFIE',
  'SUSPENDU'
);

-- Table vendor_certifications
CREATE TABLE IF NOT EXISTS vendor_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vendeur concerné
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Statut certification
  status vendor_certification_status NOT NULL DEFAULT 'NON_CERTIFIE',
  
  -- Admin vérificateur (CEO ou SUPER_ADMIN uniquement)
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  
  -- Historique
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  last_status_change TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notes internes (visibles uniquement par admins)
  internal_notes TEXT,
  rejection_reason TEXT,
  
  -- Score paiement (extension future)
  payment_score INTEGER DEFAULT 0 CHECK (payment_score >= 0 AND payment_score <= 100),
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte : Un seul enregistrement par vendeur
  UNIQUE(vendor_id)
);

-- Index pour performance
CREATE INDEX idx_vendor_certifications_vendor_id ON vendor_certifications(vendor_id);
CREATE INDEX idx_vendor_certifications_status ON vendor_certifications(status);
CREATE INDEX idx_vendor_certifications_verified_by ON vendor_certifications(verified_by);

-- Trigger pour updated_at
CREATE TRIGGER update_vendor_certifications_updated_at
  BEFORE UPDATE ON vendor_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE vendor_certifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Lecture publique du statut CERTIFIE uniquement
CREATE POLICY "Public can view certified vendors"
  ON vendor_certifications
  FOR SELECT
  USING (status = 'CERTIFIE');

-- Policy 2: Vendeurs peuvent voir leur propre certification
CREATE POLICY "Vendors can view own certification"
  ON vendor_certifications
  FOR SELECT
  USING (
    auth.uid() = vendor_id
  );

-- Policy 3: CEO/SUPER_ADMIN peuvent tout voir
CREATE POLICY "Admins can view all certifications"
  ON vendor_certifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('CEO', 'SUPER_ADMIN')
    )
  );

-- Policy 4: CEO/SUPER_ADMIN peuvent créer/modifier certifications
CREATE POLICY "Admins can manage certifications"
  ON vendor_certifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('CEO', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('CEO', 'SUPER_ADMIN')
    )
  );

-- Policy 5: Vendeurs peuvent demander certification (INSERT seulement)
CREATE POLICY "Vendors can request certification"
  ON vendor_certifications
  FOR INSERT
  WITH CHECK (
    auth.uid() = vendor_id
    AND status = 'EN_ATTENTE'
  );

-- =====================================================
-- FONCTION: Auto-créer certification pour nouveaux vendeurs
-- =====================================================

CREATE OR REPLACE FUNCTION create_vendor_certification()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer automatiquement une certification NON_CERTIFIE pour les vendeurs
  IF NEW.role = 'VENDOR' THEN
    INSERT INTO vendor_certifications (vendor_id, status)
    VALUES (NEW.id, 'NON_CERTIFIE')
    ON CONFLICT (vendor_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur création de profil vendeur
CREATE TRIGGER auto_create_vendor_certification
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'VENDOR')
  EXECUTE FUNCTION create_vendor_certification();

-- =====================================================
-- FONCTION: Calculer score paiement (extension future)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_payment_score(vendor_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tx INTEGER;
  success_rate DECIMAL;
  score INTEGER;
BEGIN
  -- Récupérer stats transactions
  SELECT 
    successful_transactions,
    failed_transactions
  INTO total_tx, success_rate
  FROM vendor_certifications
  WHERE vendor_id = vendor_uuid;
  
  -- Calcul score (0-100)
  IF (total_tx + success_rate) = 0 THEN
    RETURN 0;
  END IF;
  
  score := ROUND((total_tx::DECIMAL / (total_tx + success_rate)) * 100);
  
  -- Mise à jour
  UPDATE vendor_certifications
  SET payment_score = score
  WHERE vendor_id = vendor_uuid;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VUE: Vendeurs certifiés avec infos publiques
-- =====================================================

CREATE OR REPLACE VIEW certified_vendors AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.avatar_url,
  vc.status,
  vc.verified_at,
  vc.payment_score,
  vc.successful_transactions,
  vc.total_revenue
FROM profiles p
INNER JOIN vendor_certifications vc ON vc.vendor_id = p.id
WHERE 
  p.role = 'VENDOR'
  AND vc.status = 'CERTIFIE';

-- Accès public à la vue
GRANT SELECT ON certified_vendors TO anon, authenticated;

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Créer certifications pour vendeurs existants
INSERT INTO vendor_certifications (vendor_id, status)
SELECT id, 'NON_CERTIFIE'
FROM profiles
WHERE role = 'VENDOR'
ON CONFLICT (vendor_id) DO NOTHING;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE vendor_certifications IS 'Système de certification vendeur contrôlé par PDG/Admin';
COMMENT ON COLUMN vendor_certifications.status IS 'NON_CERTIFIE | EN_ATTENTE | CERTIFIE | SUSPENDU';
COMMENT ON COLUMN vendor_certifications.verified_by IS 'Admin qui a certifié (CEO/SUPER_ADMIN uniquement)';
COMMENT ON COLUMN vendor_certifications.payment_score IS 'Score 0-100 basé sur historique paiements (extension future)';
COMMENT ON COLUMN vendor_certifications.internal_notes IS 'Notes internes visibles uniquement par admins';
