# ANALYSE DOUBLONS STRIPE & WALLET - BASE DE DONNÉES
Date: 4 janvier 2026

## 🚨 PROBLÈMES DÉTECTÉS

### 1. TABLE `wallets` - CONFLIT MAJEUR

**4 migrations différentes créent la même table `wallets` :**

1. **20241201100000_wallet_transaction_system.sql** (1er décembre 2024)
   - Colonnes: id, user_id, balance, currency, pin_hash, biometric_enabled, status, daily_limit, monthly_limit
   - Type wallet_status: ('active', 'suspended', 'blocked', 'pending_verification')

2. **20250102010000_wallet_system_complete.sql** (2 janvier 2025)
   - Colonnes: id, user_id, balance, currency, status, wallet_address
   - Type wallet_status: ('active', 'suspended', 'closed')
   - RÉFÉRENCE: auth.users (pas profiles!)

3. **20250102050000_complete_syndicate_system.sql** (2 janvier 2025)
   - Système de syndicat avec wallet

4. **20260104_stripe_payments.sql** (4 janvier 2026 - AUJOURD'HUI)
   - Colonnes Stripe: id, user_id, available_balance, pending_balance, frozen_balance, currency, status
   - Type wallet_status: ('ACTIVE', 'FROZEN', 'SUSPENDED')

### 2. TYPE ENUM `wallet_status` - CONFLIT

**3 définitions différentes du même type:**

- Migration 1: `('active', 'suspended', 'blocked', 'pending_verification')`
- Migration 2: `('active', 'suspended', 'closed')`
- Migration Stripe: `('ACTIVE', 'FROZEN', 'SUSPENDED')`

### 3. TYPE ENUM `transaction_type` - CONFLIT

**Plusieurs définitions:**
- Wallet System: `('credit', 'debit', 'transfer')`
- Stripe System: `('PAYMENT', 'COMMISSION', 'WITHDRAWAL', 'REFUND', 'CHARGEBACK')`

### 4. TYPE ENUM `transaction_status` - CONFLIT

**Multiples définitions:**
- Wallet: `('pending', 'completed', 'failed', 'cancelled')`
- Stripe: Nom différent `payment_status` avec `('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED', 'DISPUTED')`

---

## ⚠️ CONSÉQUENCES

1. **Migrations vont ÉCHOUER** si appliquées séquentiellement
2. **Types ENUM incompatibles** entre systèmes
3. **Structures de colonnes différentes** dans la table wallets
4. **Références différentes** (auth.users vs profiles)
5. **Risque de perte de données** si une migration écrase l'autre

---

## ✅ SOLUTION RECOMMANDÉE

### Option 1: RENOMMER les tables Stripe (RECOMMANDÉ)

Renommer les tables du système Stripe pour éviter les conflits:

```sql
-- Au lieu de "wallets", utiliser:
stripe_wallets

-- Au lieu de "wallet_transactions", utiliser:
stripe_wallet_transactions

-- Créer de nouveaux types avec préfixe:
stripe_wallet_status
stripe_transaction_type
stripe_payment_status
```

**Avantages:**
- Pas de conflit avec les tables existantes
- Système Stripe indépendant
- Peut coexister avec le wallet interne
- Migration simple

### Option 2: FUSION des systèmes (COMPLEXE)

Fusionner le système wallet existant avec Stripe:

**Inconvénients:**
- Modifications importantes dans les 3 migrations existantes
- Risque de casser les fonctionnalités actuelles
- Tests approfondis requis
- Temps de développement long

### Option 3: DROP et RECRÉATION (DANGEREUX)

Supprimer toutes les tables existantes et recréer:

**DANGER:**
- Perte de TOUTES les données wallet existantes
- Nécessite backup complet
- Migration des données requise
- Downtime important

---

## 🎯 ACTION IMMÉDIATE RECOMMANDÉE

1. **NE PAS appliquer la migration Stripe actuelle** (20260104_stripe_payments.sql)

2. **Renommer les tables Stripe:**
   - wallets → stripe_wallets
   - wallet_transactions → stripe_wallet_transactions
   - withdrawals → stripe_withdrawals
   
3. **Renommer les types ENUM:**
   - wallet_status → stripe_wallet_status
   - transaction_type → stripe_transaction_type (si conflit)
   - payment_status (garder, pas de conflit)

4. **Créer une nouvelle migration:** 20260104_stripe_payments_v2.sql

---

## 📊 TABLES EXISTANTES À VÉRIFIER

Tables qui utilisent `wallets`:
- wallet_transactions (3 versions)
- commission_revenue
- wallet_topups
- agent_wallets
- vendor_payments
- Et probablement beaucoup d'autres...

**IMPORTANT:** Vérifier TOUTES les références avant modification!

---

## 🔧 SCRIPT DE VÉRIFICATION

```sql
-- Vérifier si la table wallets existe déjà
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE tablename = 'wallets';

-- Vérifier la structure actuelle
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'wallets' 
ORDER BY ordinal_position;

-- Vérifier les types ENUM existants
SELECT 
    t.typname, 
    e.enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname LIKE '%wallet%' 
   OR t.typname LIKE '%transaction%'
ORDER BY t.typname, e.enumsortorder;
```

---

## ⏭️ PROCHAINES ÉTAPES

1. ✅ Exécuter le script de vérification ci-dessus
2. ✅ Confirmer la structure actuelle de la DB
3. ✅ Décider: Renommer OU Fusionner OU Drop
4. ✅ Créer nouvelle migration corrigée
5. ✅ Tester sur environnement de dev
6. ✅ Appliquer en production

---

**CONCLUSION:** Ne PAS appliquer la migration Stripe actuelle sans renommer les tables!
