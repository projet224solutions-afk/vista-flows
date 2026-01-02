# 🐛 DIAGNOSTIC - ABONNEMENT TAXI-MOTO NON FONCTIONNEL

## 🔍 PROBLÈMES IDENTIFIÉS

### 1. Abonnement Taxi-Moto ne fonctionne pas
**Symptômes potentiels** :
- Erreur lors de la souscription
- Fonction `subscribe_driver` échoue
- Configuration non chargée
- Wallet non débité

### 2. Offre abonnement PDG ne fonctionne pas
**Symptômes potentiels** :
- Bouton "Offrir abonnement" inactif
- Erreur lors de l'offre gratuite
- Utilisateur non trouvé

## 🔬 ANALYSE TECHNIQUE

### Structure de la Base de Données

#### Table `driver_subscriptions`
```sql
- id UUID
- user_id UUID
- type TEXT ('taxi', 'livreur')
- price NUMERIC
- status TEXT ('active', 'expired', 'pending', 'suspended')
- start_date TIMESTAMPTZ
- end_date TIMESTAMPTZ
- payment_method TEXT ('wallet', 'mobile_money', 'card', 'pdg_gift')
- transaction_id TEXT
- billing_cycle TEXT ('monthly', 'yearly') ✅ Ajouté migration 20251116
- metadata JSONB
```

#### Table `driver_subscription_config`
```sql
- id UUID
- subscription_type TEXT ('taxi', 'livreur', 'both')
- price NUMERIC (50000 GNF par défaut)
- duration_days INTEGER (30 jours)
- yearly_price NUMERIC ✅ Ajouté migration 20251116
- yearly_discount_percentage NUMERIC
- is_active BOOLEAN
```

### Fonction RPC `subscribe_driver`
**Localisation** : `20251228112357_97230d50-8d4f-4be6-b664-74e72574d753.sql`

**Paramètres** :
- `p_user_id` UUID
- `p_type` TEXT
- `p_payment_method` TEXT (default 'wallet')
- `p_transaction_id` TEXT (default NULL)
- `p_billing_cycle` TEXT (default 'monthly')

**Processus** :
1. Récupère prix selon billing_cycle (monthly/yearly)
2. Vérifie solde wallet
3. Débite wallet
4. Crée transaction dans `transactions`
5. Désactive anciens abonnements
6. Crée nouvel abonnement
7. Enregistre revenu dans `driver_subscription_revenues`

## 🚨 PROBLÈMES POTENTIELS

### Problème 1 : payment_method non autorisé
```sql
-- Dans driver_subscriptions
payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'mobile_money', 'card'))
```
❌ **Manque 'pdg_gift'** pour les abonnements offerts par le PDG

### Problème 2 : Configuration manquante
- Si aucune config avec `subscription_type = 'both'` et `is_active = TRUE`
- Fonction retourne NULL → EXCEPTION

### Problème 3 : Wallet non initialisé
- Si wallet n'existe pas → Exception "Wallet non trouvé"
- Service appelle `ensureWallet()` mais peut échouer

### Problème 4 : Erreur dans handleOfferSubscription (PDG)
**Fichier** : `DriverSubscriptionManagement.tsx` ligne 230-284

Recherche utilisateur par :
1. UUID direct
2. Email ou téléphone dans profiles

Mais peut échouer si :
- Format UUID invalide
- Utilisateur non trouvé
- Erreur SQL lors de l'insertion

## ✅ CORRECTIONS À APPLIQUER

### Correction 1 : Ajouter 'pdg_gift' aux payment_methods autorisés
```sql
ALTER TABLE driver_subscriptions
DROP CONSTRAINT IF EXISTS driver_subscriptions_payment_method_check;

ALTER TABLE driver_subscriptions
ADD CONSTRAINT driver_subscriptions_payment_method_check
CHECK (payment_method IN ('wallet', 'mobile_money', 'card', 'pdg_gift'));
```

### Correction 2 : Améliorer gestion config manquante
Dans `driverSubscriptionService.ts` :
- ✅ Déjà implémenté : `getDefaultConfig()` comme fallback

### Correction 3 : Meilleure gestion erreurs dans subscribe()
Hook `useDriverSubscription.tsx` ligne 75-127 :
- ✅ Déjà géré : Messages d'erreur détaillés

### Correction 4 : Validation UUID dans PDG
`DriverSubscriptionManagement.tsx` :
- Ajouter validation format UUID avant requête
- Améliorer feedback utilisateur

### Correction 5 : Logging et monitoring
- Ajouter logs console détaillés
- Capturer erreurs Supabase spécifiques

## 🧪 TESTS À EFFECTUER

### Test 1 : Abonnement via Wallet (Conducteur)
```typescript
// Interface Taxi-Moto
1. Vérifier solde wallet > 50000 GNF
2. Cliquer "S'abonner"
3. Sélectionner "Monthly"
4. Confirmer paiement
5. ✅ Vérifier : Abonnement actif, wallet débité, transaction créée
```

### Test 2 : Offrir abonnement (PDG)
```typescript
// Interface PDG → Abonnements Conducteurs
1. Ouvrir "Offrir abonnement gratuit"
2. Entrer user_id OU email conducteur
3. Sélectionner type: 'taxi'
4. Définir durée: 30 jours
5. Confirmer
6. ✅ Vérifier : Abonnement créé avec payment_method='pdg_gift'
```

### Test 3 : Vérifier configuration
```sql
-- Dans Supabase SQL Editor
SELECT * FROM driver_subscription_config WHERE is_active = TRUE;
-- Doit retourner 1 ligne avec price=50000, yearly_price=570000
```

### Test 4 : Vérifier payment_method constraint
```sql
-- Tester insertion avec 'pdg_gift'
INSERT INTO driver_subscriptions (user_id, type, price, status, start_date, end_date, payment_method)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'taxi',
  0,
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  'pdg_gift'
);
-- ❌ Si erreur constraint → Appliquer Correction 1
-- ✅ Si OK → Constraint déjà mis à jour
```

## 📊 PROCHAINES ÉTAPES

1. ✅ **Identifier l'erreur exacte** : Consulter logs console/Supabase
2. 🔧 **Appliquer corrections SQL** si nécessaire
3. 🧪 **Tester en développement**
4. 📱 **Valider sur mobile et desktop**
5. 🚀 **Déployer en production**

---

Date: 2025-01-02
Status: 🔬 EN DIAGNOSTIC
