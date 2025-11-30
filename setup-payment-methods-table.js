/**
 * SCRIPT D'INITIALISATION AUTOMATIQUE DE LA TABLE user_payment_methods
 * Crée la table directement via l'API Supabase
 * 224Solutions - Auto Setup Script
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const migrationSQL = `
-- Création table user_payment_methods
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('wallet', 'orange_money', 'mtn_money', 'cash', 'bank_card')),
  phone_number VARCHAR(20),
  card_last_four VARCHAR(4),
  card_brand VARCHAR(50),
  label VARCHAR(100),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, method_type, phone_number),
  UNIQUE(user_id, method_type, card_last_four)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON public.user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_default ON public.user_payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_active ON public.user_payment_methods(user_id, is_active) WHERE is_active = true;

-- Trigger updated_at
CREATE TRIGGER trigger_user_payment_methods_updated_at
  BEFORE UPDATE ON public.user_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs voient leurs moyens de paiement"
  ON public.user_payment_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs créent leurs moyens de paiement"
  ON public.user_payment_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs modifient leurs moyens de paiement"
  ON public.user_payment_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs suppriment leurs moyens de paiement"
  ON public.user_payment_methods FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction single default
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.user_payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default
  BEFORE INSERT OR UPDATE ON public.user_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment_method();

-- Wallet par défaut
INSERT INTO public.user_payment_methods (user_id, method_type, is_default, is_active, label)
SELECT id, 'wallet', true, true, 'Portefeuille 224Solutions'
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM public.user_payment_methods WHERE method_type = 'wallet')
ON CONFLICT (user_id, method_type, phone_number) DO NOTHING;
`;

console.log('🚀 Création automatique de la table user_payment_methods...\n');
console.log('📋 INSTRUCTIONS:\n');
console.log('1. Allez sur: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/editor');
console.log('2. Cliquez sur "SQL Editor" dans le menu');
console.log('3. Cliquez sur "New Query"');
console.log('4. Copiez le SQL ci-dessous:');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(migrationSQL);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('5. Collez dans l\'éditeur SQL');
console.log('6. Cliquez sur "Run" (ou Ctrl+Enter)\n');
console.log('✅ Après exécution, rechargez votre application\n');
