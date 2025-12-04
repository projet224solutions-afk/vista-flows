# 🔧 CORRECTION CRITIQUE: SYSTÈME ABONNEMENT VENDEUR

## ❌ Problème Identifié

Le système d'abonnement vendeur **ne débitait PAS le wallet** lors de l'achat!

### Symptômes
- ✅ Abonnement créé dans la base
- ✅ Revenu PDG enregistré
- ❌ **Wallet utilisateur NON débité**
- ❌ **Utilisateurs obtiennent des abonnements gratuits**

### Cause Racine
La fonction SQL `subscribe_user()` créait l'abonnement sans vérifier ni débiter le wallet:

```sql
-- ANCIENNE FONCTION (BUGUÉE)
CREATE FUNCTION subscribe_user(...) AS $$
BEGIN
  -- 1. Récupère le plan ✅
  -- 2. Crée l'abonnement ✅
  -- 3. Enregistre revenu PDG ✅
  -- 4. OUBLIE de débiter le wallet ❌❌❌
  RETURN subscription_id;
END;
$$;
```

## ✅ Solution Implémentée

Nouvelle fonction `subscribe_user()` avec:
1. ✅ **Vérification du solde wallet**
2. ✅ **Débit automatique du montant**
3. ✅ **Transaction wallet enregistrée**
4. ✅ **Gestion erreurs (solde insuffisant, wallet manquant)**
5. ✅ **Support cycles: monthly, quarterly, yearly**

### Fichier Créé
```
📁 supabase/migrations/
  └── 20251204_fix_subscription_wallet_debit.sql (175 lignes)
```

## 🔄 Déploiement sur Supabase

### Étape 1: Connexion Supabase Dashboard
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet **224Solutions**
3. Aller dans **SQL Editor**

### Étape 2: Exécuter la Migration
```bash
# Option A: Via Supabase Dashboard
# Copier le contenu de: supabase/migrations/20251204_fix_subscription_wallet_debit.sql
# Coller dans SQL Editor > Run

# Option B: Via CLI Supabase
supabase db push
```

### Étape 3: Vérifier le Déploiement
Exécutez ce SQL pour tester:

```sql
-- Test 1: Vérifier que la fonction existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'subscribe_user';

-- Test 2: Vérifier les permissions
SELECT has_function_privilege('authenticated', 'subscribe_user(uuid,uuid,text,text,text)', 'execute');

-- Résultat attendu: true
```

## 🧪 Tests à Effectuer Après Déploiement

### Test 1: Achat Abonnement avec Solde Suffisant ✅
```typescript
// 1. User wallet: 100,000 GNF
// 2. Plan Basic: 50,000 GNF
// 3. Acheter abonnement
// Résultat attendu:
// - Abonnement créé ✅
// - Wallet débité: 50,000 GNF ✅
// - Nouveau solde: 50,000 GNF ✅
// - Transaction wallet créée ✅
```

### Test 2: Achat avec Solde Insuffisant ❌
```typescript
// 1. User wallet: 30,000 GNF
// 2. Plan Premium: 100,000 GNF
// 3. Tenter d'acheter
// Résultat attendu:
// - Erreur: "Solde insuffisant: 30000 GNF disponible, 100000 GNF requis"
// - Wallet NON débité ✅
// - Abonnement NON créé ✅
```

### Test 3: Wallet Manquant ❌
```typescript
// 1. User SANS wallet
// 2. Tenter d'acheter
// Résultat attendu:
// - Erreur: "Wallet non trouvé pour cet utilisateur"
// - Abonnement NON créé ✅
```

### Test 4: Cycles de Facturation
```sql
-- Monthly (1 mois)
SELECT subscribe_user(user_id, plan_id, 'wallet', NULL, 'monthly');
-- Prix: monthly_price_gnf
-- Durée: duration_days (30j)

-- Quarterly (3 mois)
SELECT subscribe_user(user_id, plan_id, 'wallet', NULL, 'quarterly');
-- Prix: monthly_price_gnf * 3
-- Durée: duration_days * 3 (90j)

-- Yearly (12 mois)
SELECT subscribe_user(user_id, plan_id, 'wallet', NULL, 'yearly');
-- Prix: yearly_price_gnf (avec réduction 5%)
-- Durée: duration_days * 12 (365j)
```

## 📊 Impact Business

### Avant la Correction
- ❌ Perte de revenus: **100% des abonnements gratuits**
- ❌ Wallets non synchronisés
- ❌ Comptabilité PDG incorrecte

### Après la Correction
- ✅ Débits automatiques
- ✅ Revenus PDG précis
- ✅ Historique transactions wallet
- ✅ Validation solde obligatoire

## 🔐 Sécurité Ajoutée

### Validations
1. ✅ Plan actif et existant
2. ✅ Wallet existant
3. ✅ Solde suffisant
4. ✅ Montant positif

### Atomicité
```sql
-- Transaction SQL atomique:
BEGIN;
  -- Débit wallet
  UPDATE wallets SET balance = balance - price;
  -- Créer abonnement
  INSERT INTO subscriptions (...);
  -- Enregistrer revenu PDG
  INSERT INTO revenus_pdg (...);
COMMIT;
-- Si une étape échoue, tout est annulé (ROLLBACK)
```

## 📝 Modifications Détaillées

### Nouvelle Fonction `subscribe_user()`

**Paramètres:**
- `p_user_id UUID` - ID utilisateur
- `p_plan_id UUID` - ID plan choisi
- `p_payment_method TEXT` - Méthode (wallet, mobile_money, etc.)
- `p_transaction_id TEXT` - ID transaction externe (optionnel)
- `p_billing_cycle TEXT` - Cycle: monthly | quarterly | yearly

**Retour:**
- `UUID` - ID de l'abonnement créé
- **Exception** si erreur (solde insuffisant, wallet manquant, plan invalide)

**Flux d'Exécution:**
```
1. SELECT plan → Récupère prix + durée selon billing_cycle
   ↓
2. IF payment_method = 'wallet' THEN
     ↓
   2a. SELECT wallet → Vérifie existence
     ↓
   2b. IF balance < price THEN RAISE EXCEPTION 'Solde insuffisant'
     ↓
   2c. UPDATE wallets SET balance = balance - price
     ↓
   2d. INSERT INTO wallet_transactions (debit)
     ↓
3. UPDATE subscriptions SET status = 'cancelled' (anciens abonnements)
   ↓
4. INSERT INTO subscriptions (nouvel abonnement actif)
   ↓
5. INSERT INTO revenus_pdg (100% du montant)
   ↓
6. RETURN subscription_id
```

## 🚨 Points d'Attention

### 1. Rétroactivité
Cette migration **ne corrige PAS** les abonnements créés avant le 04/12/2024. Pour cela, exécutez:

```sql
-- Identifier les abonnements sans débit wallet
SELECT 
  s.id as subscription_id,
  s.user_id,
  s.price_paid_gnf,
  s.created_at,
  w.balance as wallet_balance
FROM subscriptions s
JOIN wallets w ON w.user_id = s.user_id
WHERE s.created_at >= '2024-12-01'
  AND s.payment_method = 'wallet'
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.description LIKE '%Abonnement%'
      AND wt.created_at BETWEEN s.created_at - INTERVAL '5 minutes' 
                            AND s.created_at + INTERVAL '5 minutes'
  );

-- Pour débiter rétroactivement (ADMIN SEULEMENT):
-- NE PAS EXÉCUTER SANS VALIDATION MANUELLE
/*
UPDATE wallets w
SET balance = balance - s.price_paid_gnf
FROM subscriptions s
WHERE w.user_id = s.user_id
  AND s.id IN (SELECT subscription_id FROM liste_ci_dessus);
*/
```

### 2. Méthodes de Paiement Autres
Si vous ajoutez des méthodes de paiement (Mobile Money, Carte bancaire):
```sql
-- La fonction ne débite le wallet QUE si payment_method = 'wallet'
-- Pour autres méthodes, gérer le paiement externe AVANT d'appeler subscribe_user()
```

### 3. Auto-Renouvellement (À Implémenter)
```sql
-- Créer fonction pour renouvellement automatique
CREATE FUNCTION auto_renew_subscriptions() RETURNS INTEGER AS $$
BEGIN
  -- Pour chaque abonnement avec auto_renew = true ET current_period_end < NOW() + 3 days
  -- Appeler subscribe_user() avec même plan
END;
$$;

-- Configurer cron job (pg_cron extension)
SELECT cron.schedule('auto-renew-subscriptions', '0 2 * * *', 'SELECT auto_renew_subscriptions()');
```

## 📞 Support

En cas de problème:
1. Vérifier logs Supabase: Dashboard > Logs > PostgreSQL
2. Tester manuellement dans SQL Editor
3. Vérifier permissions `authenticated` role
4. Contacter support technique 224Solutions

---

**Date de création:** 04 Décembre 2024  
**Auteur:** GitHub Copilot  
**Statut:** ✅ Migration créée - ⚠️ Déploiement requis  
**Impact:** 🔴 CRITIQUE - Corrige perte revenus abonnements
