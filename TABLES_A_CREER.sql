-- 🗄️ TABLES MANQUANTES À CRÉER DANS SUPABASE
-- Exécuter ces commandes dans Supabase SQL Editor

-- ============================================
-- 1. TABLES SYNDICAT (Bureau de Syndicat)
-- ============================================

CREATE TABLE IF NOT EXISTS syndicat_bureau (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_code TEXT UNIQUE NOT NULL,
  prefecture TEXT,
  commune TEXT,
  president_name TEXT,
  president_email TEXT,
  president_phone TEXT,
  full_location TEXT,
  status TEXT DEFAULT 'pending',
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syndicat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID REFERENCES syndicat_bureau(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  membership_type TEXT DEFAULT 'individual',
  status TEXT DEFAULT 'active',
  join_date TIMESTAMPTZ DEFAULT NOW(),
  license_number TEXT,
  vehicle_serial TEXT,
  vehicle_type TEXT,
  cotisation_status TEXT DEFAULT 'pending',
  last_cotisation_date TIMESTAMPTZ,
  total_cotisations DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syndicat_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID REFERENCES syndicat_bureau(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registered_motos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID REFERENCES syndicat_bureau(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  moto_serial TEXT, -- Alias pour serial_number
  owner_name TEXT,
  owner_phone TEXT,
  model TEXT,
  brand TEXT,
  year INTEGER,
  color TEXT,
  status TEXT DEFAULT 'active',
  is_verified BOOLEAN DEFAULT false,
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syndicate_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID REFERENCES syndicat_bureau(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  is_critical BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TABLES TRANSITAIRE (Freight Forwarding)
-- ============================================

CREATE TABLE IF NOT EXISTS international_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transitaire_id UUID NOT NULL,
  tracking_number TEXT UNIQUE NOT NULL,
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT,
  weight DECIMAL(10,2),
  weight_unit TEXT DEFAULT 'kg',
  dimensions JSONB DEFAULT '{}',
  customs_status TEXT DEFAULT 'pending',
  customs_fees DECIMAL(10,2) DEFAULT 0,
  customs_documents JSONB DEFAULT '[]',
  estimated_delivery_date TIMESTAMPTZ,
  actual_delivery_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_tracking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES international_shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customs_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES international_shipments(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  declaration_number TEXT,
  declaration_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  total_value DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  items JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES international_shipments(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transitaire_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transitaire_id UUID NOT NULL,
  shipment_id UUID REFERENCES international_shipments(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLES EMERGENCY (Alertes d'urgence)
-- ============================================

CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'high',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  location JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLES SERVICE REVIEWS
-- ============================================

CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLES COPILOT AUDIT
-- ============================================

CREATE TABLE IF NOT EXISTS copilot_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. COLONNES MANQUANTES
-- ============================================

-- Ajouter colonnes manquantes à taxi_drivers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'taxi_drivers' AND column_name = 'rating'
  ) THEN
    ALTER TABLE taxi_drivers ADD COLUMN rating DECIMAL(2,1) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'taxi_drivers' AND column_name = 'online_since'
  ) THEN
    ALTER TABLE taxi_drivers ADD COLUMN online_since TIMESTAMPTZ;
  END IF;
END $$;

-- Ajouter colonne payment_method à deliveries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliveries' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE deliveries ADD COLUMN payment_method TEXT;
  END IF;
END $$;

-- ============================================
-- 7. INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_syndicat_members_bureau ON syndicat_members(bureau_id);
CREATE INDEX IF NOT EXISTS idx_registered_motos_bureau ON registered_motos(bureau_id);
CREATE INDEX IF NOT EXISTS idx_registered_motos_serial ON registered_motos(serial_number);
CREATE INDEX IF NOT EXISTS idx_international_shipments_transitaire ON international_shipments(transitaire_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_shipment ON shipment_tracking_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_customs_declarations_shipment ON customs_declarations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user ON emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_service ON service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_copilot_audit_user ON copilot_audit_logs(user_id);

-- ============================================
-- 8. RLS (Row Level Security)
-- ============================================

ALTER TABLE syndicat_bureau ENABLE ROW LEVEL SECURITY;
ALTER TABLE syndicat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies basiques (à adapter selon vos besoins)
CREATE POLICY "Users can view their own data" ON syndicat_members
  FOR SELECT USING (true);

CREATE POLICY "Users can view shipments" ON international_shipments
  FOR SELECT USING (true);

CREATE POLICY "Users can create emergency alerts" ON emergency_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own alerts" ON emergency_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- ✅ SCRIPT TERMINÉ
-- ============================================
-- Toutes les tables et colonnes manquantes ont été créées
