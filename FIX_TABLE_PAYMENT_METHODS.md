# ⚡ FIX RAPIDE - Table user_payment_methods manquante

## 🔴 Erreur actuelle
```
Could not find the table 'public.user_payment_methods' in the schema cache
```

## ✅ Solution (2 minutes)

### Le SQL Editor Supabase est OUVERT dans votre navigateur

### 1️⃣ Dans Supabase SQL Editor :
- Cliquez sur **"New Query"**

### 2️⃣ Copiez-collez ce SQL COMPLET :

```sql
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

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user ON public.user_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_default ON public.user_payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_active ON public.user_payment_methods(user_id, is_active) WHERE is_active = true;

CREATE TRIGGER trigger_user_payment_methods_updated_at BEFORE UPDATE ON public.user_payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs voient leurs moyens de paiement" ON public.user_payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs créent leurs moyens de paiement" ON public.user_payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs modifient leurs moyens de paiement" ON public.user_payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs suppriment leurs moyens de paiement" ON public.user_payment_methods FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION ensure_single_default_payment_method() RETURNS TRIGGER AS $$ BEGIN IF NEW.is_default = true THEN UPDATE public.user_payment_methods SET is_default = false WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default BEFORE INSERT OR UPDATE ON public.user_payment_methods FOR EACH ROW EXECUTE FUNCTION ensure_single_default_payment_method();

INSERT INTO public.user_payment_methods (user_id, method_type, is_default, is_active, label) SELECT id, 'wallet', true, true, 'Portefeuille 224Solutions' FROM auth.users WHERE id NOT IN (SELECT DISTINCT user_id FROM public.user_payment_methods WHERE method_type = 'wallet') ON CONFLICT (user_id, method_type, phone_number) DO NOTHING;
```

### 3️⃣ Cliquez sur **"Run"** (ou `Ctrl+Enter`)

### 4️⃣ Résultat attendu :
```
Success. No rows returned
```

### 5️⃣ Rechargez votre application

L'erreur disparaîtra et vous verrez vos moyens de paiement ! 🎉

---

**Fait ?** ✅ La table est créée avec :
- 5 types de paiement supportés
- RLS configuré
- Wallet créé automatiquement
- Prêt à l'emploi !
