# 🚀 APPLIQUER CES MIGRATIONS DANS SUPABASE SQL EDITOR

## Étape 1 : Ouvrir Supabase Dashboard
1. Allez sur https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new
2. Copiez et exécutez les scripts ci-dessous **dans l'ordre**

---

## Script 1 : Tables de base Dropshipping

```sql
-- =============================================
-- DROPSHIP BASE TABLES - MINIMAL
-- =============================================

-- Table des fournisseurs dropshipping
CREATE TABLE IF NOT EXISTS public.dropship_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  supplier_type TEXT DEFAULT 'international',
  country TEXT DEFAULT 'China',
  country_code TEXT DEFAULT 'CN',
  city TEXT,
  address TEXT,
  currency TEXT DEFAULT 'USD',
  reliability_score INTEGER DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  total_orders INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  has_api BOOLEAN DEFAULT false,
  api_endpoint TEXT,
  api_type TEXT,
  default_currency TEXT DEFAULT 'USD',
  minimum_order_value DECIMAL(12,2) DEFAULT 0,
  shipping_time_days INTEGER DEFAULT 15,
  contact_name TEXT,
  contact_phone TEXT,
  wechat_id TEXT,
  whatsapp_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des produits dropshipping
CREATE TABLE IF NOT EXISTS public.dropship_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.dropship_suppliers(id) ON DELETE SET NULL,
  product_id UUID, -- Lien vers products existant
  source_product_id TEXT,
  source_url TEXT,
  original_title TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  supplier_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  supplier_currency TEXT DEFAULT 'USD',
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_currency TEXT DEFAULT 'GNF',
  profit_margin DECIMAL(5,2) DEFAULT 0,
  variants JSONB DEFAULT '[]'::JSONB,
  moq INTEGER DEFAULT 1,
  stock_quantity INTEGER,
  is_active BOOLEAN DEFAULT true,
  auto_sync BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  china_import_id UUID,
  china_supplier_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des commandes dropshipping
CREATE TABLE IF NOT EXISTS public.dropship_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_reference TEXT NOT NULL DEFAULT ('DS-' || substr(gen_random_uuid()::text, 1, 8)),
  vendor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_order_id UUID,
  supplier_id UUID REFERENCES public.dropship_suppliers(id),
  product_id UUID REFERENCES public.dropship_products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  supplier_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  supplier_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  customer_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  customer_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'
  )),
  tracking_number TEXT,
  tracking_url TEXT,
  shipping_address JSONB,
  supplier_notes TEXT,
  internal_notes TEXT,
  ordered_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des paramètres dropshipping par vendeur
CREATE TABLE IF NOT EXISTS public.dropship_settings (
  vendor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_sync_prices BOOLEAN DEFAULT true,
  sync_frequency_hours INTEGER DEFAULT 24,
  default_markup_percent DECIMAL(5,2) DEFAULT 30.0,
  auto_order BOOLEAN DEFAULT false,
  notification_email TEXT,
  preferred_currency TEXT DEFAULT 'GNF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des logs d'activité
CREATE TABLE IF NOT EXISTS public.dropship_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimisation
CREATE INDEX IF NOT EXISTS idx_dropship_suppliers_active ON public.dropship_suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_dropship_products_vendor ON public.dropship_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dropship_products_active ON public.dropship_products(is_active);
CREATE INDEX IF NOT EXISTS idx_dropship_orders_vendor ON public.dropship_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dropship_orders_status ON public.dropship_orders(status);
CREATE INDEX IF NOT EXISTS idx_dropship_logs_vendor ON public.dropship_activity_logs(vendor_id);

-- Enable RLS
ALTER TABLE public.dropship_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropship_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "dropship_suppliers_read" ON public.dropship_suppliers;
CREATE POLICY "dropship_suppliers_read" ON public.dropship_suppliers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "dropship_suppliers_admin_write" ON public.dropship_suppliers;
CREATE POLICY "dropship_suppliers_admin_write" ON public.dropship_suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'ceo'))
  );

DROP POLICY IF EXISTS "dropship_products_vendor" ON public.dropship_products;
CREATE POLICY "dropship_products_vendor" ON public.dropship_products
  FOR ALL USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "dropship_orders_vendor" ON public.dropship_orders;
CREATE POLICY "dropship_orders_vendor" ON public.dropship_orders
  FOR ALL USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "dropship_settings_vendor" ON public.dropship_settings;
CREATE POLICY "dropship_settings_vendor" ON public.dropship_settings
  FOR ALL USING (auth.uid() = vendor_id);

DROP POLICY IF EXISTS "dropship_logs_access" ON public.dropship_activity_logs;
CREATE POLICY "dropship_logs_access" ON public.dropship_activity_logs
  FOR ALL USING (
    vendor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin', 'ceo'))
  );

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_dropship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dropship_suppliers_updated ON public.dropship_suppliers;
CREATE TRIGGER dropship_suppliers_updated BEFORE UPDATE ON public.dropship_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_dropship_updated_at();

DROP TRIGGER IF EXISTS dropship_products_updated ON public.dropship_products;
CREATE TRIGGER dropship_products_updated BEFORE UPDATE ON public.dropship_products
  FOR EACH ROW EXECUTE FUNCTION update_dropship_updated_at();

DROP TRIGGER IF EXISTS dropship_orders_updated ON public.dropship_orders;
CREATE TRIGGER dropship_orders_updated BEFORE UPDATE ON public.dropship_orders
  FOR EACH ROW EXECUTE FUNCTION update_dropship_updated_at();

-- =============================================
-- DONNÉES INITIALES - Fournisseurs de démo
-- =============================================

INSERT INTO public.dropship_suppliers (name, company_name, country, country_code, currency, supplier_type, is_active, is_verified, reliability_score, shipping_time_days)
VALUES 
  ('AliExpress Global', 'Alibaba Group', 'China', 'CN', 'USD', 'marketplace', true, true, 85, 15),
  ('Alibaba Trade', 'Alibaba International', 'China', 'CN', 'USD', 'wholesale', true, true, 90, 20),
  ('1688.com', 'Alibaba Domestic', 'China', 'CN', 'CNY', 'wholesale', true, true, 80, 25),
  ('CJ Dropshipping', 'CJ International', 'China', 'CN', 'USD', 'dropship', true, true, 88, 12),
  ('Spocket EU', 'Spocket Inc', 'Europe', 'EU', 'EUR', 'dropship', true, true, 92, 7)
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Tables dropship créées avec succès!';
RAISE NOTICE '✅ 5 fournisseurs initiaux ajoutés';
```

---

## Script 2 : Tables China Dropshipping (optionnel)

Exécutez le contenu du fichier `supabase/migrations/20260112_china_dropshipping_module.sql` si vous voulez les fonctionnalités avancées Chine.

---

## Après application

Régénérez les types Supabase :
```bash
$env:SUPABASE_ACCESS_TOKEN = "VOTRE_TOKEN"
npx supabase gen types typescript --project-id uakkxaibujzxdiqzpnpr > src/integrations/supabase/types.ts
```
