# 🔍 DIAGNOSTIC COMPLET - Système Paiement & Commission

## ✅ **TESTS À EFFECTUER**

### **TEST 1: Vérifier Configuration**

Exécuter dans Supabase SQL Editor:

```sql
-- 1.1 Vérifier configuration Stripe
SELECT 
  platform_commission_rate,
  test_mode
FROM stripe_config
LIMIT 1;
-- ATTENDU: platform_commission_rate = 10 (10%)

-- 1.2 Vérifier configuration commission agent
SELECT 
  setting_key,
  setting_value,
  description
FROM commission_settings
WHERE setting_key = 'base_user_commission';
-- ATTENDU: setting_value = 0.20 (20%)

-- 1.3 Vérifier fonction existe
SELECT 
  proname,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'process_successful_payment';
-- ATTENDU: Retourne la fonction avec bloc agent_commission
```

---

### **TEST 2: Test Transaction Simulée**

```sql
-- 2.1 Créer vendeur test (si n'existe pas)
INSERT INTO profiles (id, email, full_name, role, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'vendeur-test@224.com',
  'Vendeur Test',
  'VENDOR',
  '+224600000001'
) ON CONFLICT (id) DO UPDATE SET role = 'VENDOR';

-- 2.2 Créer client test
INSERT INTO profiles (id, email, full_name, role, phone)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'client-test@224.com',
  'Client Test',
  'CLIENT',
  '+224600000002'
) ON CONFLICT (id) DO UPDATE SET role = 'CLIENT';

-- 2.3 Créer agent test
INSERT INTO profiles (id, email, full_name, role, phone)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'agent-test@224.com',
  'Agent Test',
  'AGENT',
  '+224600000003'
) ON CONFLICT (id) DO UPDATE SET role = 'AGENT';

-- 2.4 Lier client à agent
INSERT INTO agent_created_users (creator_id, creator_type, user_id)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'AGENT',
  '22222222-2222-2222-2222-222222222222'
) ON CONFLICT DO NOTHING;

-- 2.5 Créer transaction test
-- Client achète produit 50,000 GNF
-- Commission 10% = 5,000 GNF
-- Total client paie = 55,000 GNF
INSERT INTO stripe_transactions (
  id,
  stripe_payment_intent_id,
  buyer_id,
  seller_id,
  amount,
  currency,
  commission_rate,
  commission_amount,
  seller_net_amount,
  status
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'pi_test_12345',
  '22222222-2222-2222-2222-222222222222', -- Client
  '11111111-1111-1111-1111-111111111111', -- Vendeur
  55000,  -- Total facturé au client (50k + 5k)
  'GNF',
  10,     -- 10% commission plateforme
  5000,   -- 5k commission
  50000,  -- 50k net vendeur
  'SUCCEEDED'
) ON CONFLICT (id) DO UPDATE SET
  amount = 55000,
  commission_amount = 5000,
  seller_net_amount = 50000;

-- 2.6 Traiter le paiement
SELECT process_successful_payment('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
```

---

### **TEST 3: Vérifier Résultats**

```sql
-- 3.1 Vérifier wallet vendeur (doit recevoir 50,000 GNF)
SELECT 
  w.user_id,
  p.full_name,
  w.available_balance,
  w.total_earned
FROM wallets w
JOIN profiles p ON p.id = w.user_id
WHERE w.user_id = '11111111-1111-1111-1111-111111111111';
-- ATTENDU: available_balance >= 50000

-- 3.2 Vérifier wallet plateforme (doit recevoir 5,000 GNF)
SELECT 
  w.user_id,
  p.full_name,
  w.available_balance,
  w.total_earned
FROM wallets w
JOIN profiles p ON p.id = w.user_id
WHERE p.role = 'CEO';
-- ATTENDU: commission_amount ajouté

-- 3.3 Vérifier wallet agent (doit recevoir 20% de 50k = 10,000 GNF)
SELECT 
  w.user_id,
  p.full_name,
  w.available_balance,
  w.total_earned
FROM wallets w
JOIN profiles p ON p.id = w.user_id
WHERE w.user_id = '33333333-3333-3333-3333-333333333333';
-- ATTENDU: available_balance >= 10000

-- 3.4 Vérifier commission agent enregistrée
SELECT 
  commission_code,
  recipient_id,
  amount,
  commission_rate,
  status,
  source_type,
  created_at
FROM agent_commissions
WHERE recipient_id = '33333333-3333-3333-3333-333333333333';
-- ATTENDU: 1 ligne, amount = 10000, status = 'paid'

-- 3.5 Vérifier transactions wallet
SELECT 
  wt.type,
  wt.amount,
  wt.description,
  p.full_name,
  wt.created_at
FROM wallet_transactions wt
JOIN wallets w ON w.id = wt.wallet_id
JOIN profiles p ON p.id = w.user_id
WHERE wt.stripe_transaction_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY wt.created_at;
-- ATTENDU: 3 lignes
--  1. PAYMENT (vendeur, 50000 GNF)
--  2. COMMISSION (plateforme, 5000 GNF)
--  3. AGENT_COMMISSION (agent, 10000 GNF)
```

---

### **TEST 4: Calculs Mathématiques**

```sql
-- Test avec différents montants
SELECT 
  50000 as montant_produit,
  ROUND(50000 * 0.10) as commission_plateforme_10pct,
  50000 + ROUND(50000 * 0.10) as total_client_paie,
  50000 as vendeur_recoit,
  ROUND(50000 * 0.20) as agent_recoit_20pct,
  
  -- Vérification totaux
  50000 as vendeur,
  5000 as plateforme,
  10000 as agent,
  (50000 + 5000 + 10000) as total_distribue,
  
  -- CLIENT PAIE vs DISTRIBUÉ
  55000 as client_a_paye,
  55000 + 10000 as total_couts_224solutions,
  10000 as commission_agent_paye_par_224solutions;

-- Explication:
-- CLIENT: Paie 55,000 GNF (produit 50k + commission 5k)
-- VENDEUR: Reçoit 50,000 GNF (montant produit complet)
-- PLATEFORME: Reçoit 5,000 GNF (10% du produit)
-- AGENT: Reçoit 10,000 GNF (20% de 50k, payé par 224Solutions)
-- TOTAL: 55k client + 10k 224Solutions = 65k distribués
```

---

## 🚨 **DIAGNOSTIC DES PROBLÈMES**

### **Problème 1: Vendeur paie commission au lieu du client**

**Symptômes:**
- Vendeur reçoit moins que le montant produit
- Client paie seulement montant produit
- Commission déduite du vendeur

**Vérification:**
```sql
SELECT 
  id,
  amount,           -- Doit être > montant produit
  commission_amount, -- Commission
  seller_net_amount, -- Doit être = montant produit original
  (amount - commission_amount) as calcul_net
FROM stripe_transactions
WHERE status = 'SUCCEEDED'
ORDER BY created_at DESC
LIMIT 5;

-- SI seller_net_amount < amount - commission_amount
-- ALORS problème: vendeur paie commission
```

**Correction:**
Le problème vient de `create-payment-intent/index.ts` ligne 149:
```typescript
// ❌ AVANT (FAUX)
const totalAmountWithCommission = amount; // Client paie seulement produit
const sellerNetAmount = amount - commissionAmount; // Vendeur perd commission

// ✅ APRÈS (CORRECT)
const totalAmountWithCommission = amount + commissionAmount; // Client paie produit + commission
const sellerNetAmount = amount; // Vendeur reçoit montant produit complet
```

---

### **Problème 2: Agent ne reçoit pas commission**

**Symptômes:**
- Wallet agent pas crédité
- Pas d'entrée dans `agent_commissions`
- Pas de transaction AGENT_COMMISSION

**Vérification:**
```sql
-- Vérifier lien agent-client existe
SELECT * 
FROM agent_created_users
WHERE user_id = '{ID_CLIENT}';

-- Si NULL: Client pas créé par agent

-- Vérifier fonction contient bloc agent
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'process_successful_payment';

-- Chercher dans résultat: "v_buyer_creator_agent_id"
```

**Correction:**
Appliquer migration `20260105020000_agent_commission_stripe_integration.sql`

---

### **Problème 3: PWA ne se déclenche pas**

**Symptômes:**
- Pas de popup "Installer l'application"
- Pas d'icône installation dans barre Chrome

**Vérification:**
1. Ouvrir DevTools → Console
2. Chercher: `[PWA] Service Worker enregistré`
3. Chercher: `beforeinstallprompt détecté`

**Causes possibles:**
- HTTPS requis (ne marche pas en HTTP sur domaine)
- Service Worker pas enregistré
- manifest.json introuvable
- Déjà installé

**Test:**
```javascript
// Dans Console Chrome
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log('SW:', regs));

// Doit retourner au moins 1 registration
```

---

## ✅ **CHECKLIST VALIDATION FINALE**

- [ ] **Configuration**
  - [ ] stripe_config.platform_commission_rate = 10
  - [ ] commission_settings.base_user_commission = 0.20
  - [ ] Fonction process_successful_payment contient bloc agent

- [ ] **Test Transaction**
  - [ ] Transaction créée avec amount = total client
  - [ ] seller_net_amount = montant produit
  - [ ] commission_amount = 10% du produit

- [ ] **Wallets Crédités**
  - [ ] Vendeur: +montant produit (50k)
  - [ ] Plateforme: +commission (5k)
  - [ ] Agent: +20% du net vendeur (10k)

- [ ] **Enregistrements BDD**
  - [ ] agent_commissions: 1 ligne status='paid'
  - [ ] wallet_transactions: 3 lignes (PAYMENT, COMMISSION, AGENT_COMMISSION)

- [ ] **PWA**
  - [ ] Service Worker enregistré
  - [ ] Popup apparaît après 5 secondes
  - [ ] Bouton "Installer maintenant" fonctionnel

---

**Date:** 2026-01-05  
**Fichiers:** test-diagnostic-commission.sql  
**Next:** Exécuter tests SQL et corriger si nécessaire
