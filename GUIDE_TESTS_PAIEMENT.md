# 🧪 GUIDE DE TEST - Corrections Flux Paiement
**Date:** 6 janvier 2026  
**Objectif:** Valider que toutes les corrections fonctionnent correctement

---

## 📋 TESTS DISPONIBLES

### 1. Tests SQL (Backend)
**Fichier:** [test-payment-corrections.sql](test-payment-corrections.sql)

#### Que teste-t-il ?
- ✅ Existence des 3 fonctions RPC de correction
- ✅ Détection des paiements orphelins (7 derniers jours)
- ✅ Liste détaillée des paiements à corriger
- ✅ Simulation de correction (dry-run)
- ✅ État des wallets vendeurs
- ✅ Cohérence Stripe ↔ Commandes
- ✅ Cohérence Stripe ↔ Wallets
- ✅ Vérification des index de performance
- ✅ Rapport final avec taux de réussite

#### Comment l'exécuter ?
1. Ouvrir Supabase Dashboard: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql
2. Copier le contenu de [test-payment-corrections.sql](test-payment-corrections.sql)
3. Coller dans SQL Editor
4. Cliquer "Run"
5. Analyser les résultats dans l'onglet "Messages"

#### Résultats attendus
```
🎉 Taux de réussite: 100% - EXCELLENT!
✅ AUCUN PAIEMENT ORPHELIN - Système sain!
```

---

### 2. Tests Frontend (React/TypeScript)
**Fichier:** [src/utils/testPaymentFlow.ts](src/utils/testPaymentFlow.ts)

#### Que teste-t-il ?
- ✅ Configuration Stripe (clés API, commission)
- ✅ Transactions récentes et détection d'orphelins
- ✅ Cohérence commandes ↔ transactions Stripe
- ✅ Crédits wallets vendeurs (tous crédités ?)
- ✅ Disponibilité fonctions RPC de correction

#### Comment l'exécuter ?

**Option A: Dans le navigateur (Console DevTools)**
1. Ouvrir votre application 224Solutions
2. Ouvrir DevTools (F12)
3. Aller dans l'onglet "Console"
4. Taper:
   ```javascript
   runPaymentTests()
   ```
5. Analyser les résultats

**Option B: Ajouter dans une page de test**
```typescript
import { runPaymentTests } from '@/utils/testPaymentFlow';

function TestPage() {
  const handleTest = async () => {
    const results = await runPaymentTests();
    console.log('Résultats:', results);
  };

  return (
    <button onClick={handleTest}>
      Exécuter Tests Paiement
    </button>
  );
}
```

#### Résultats attendus
```
🎉 TOUS LES TESTS PASSÉS AVEC SUCCÈS!
✅ Réussis: 5/5
⚠️  Warnings: 0/5
❌ Erreurs: 0/5
```

---

## 🔍 SCÉNARIOS DE TEST MANUELS

### Test 1: Paiement bout-en-bout
**Objectif:** Vérifier qu'un nouveau paiement crée commande + crédit wallet

1. **Créer un paiement test:**
   - Utiliser carte test Stripe: `4242 4242 4242 4242`
   - Expiration: n'importe quelle date future
   - CVV: n'importe quels 3 chiffres
   - Acheter un produit

2. **Vérifier immédiatement après paiement:**
   ```sql
   -- Dans Supabase SQL Editor
   SELECT 
     st.id,
     st.stripe_payment_intent_id,
     st.status,
     o.order_number,
     wt.amount as wallet_credited
   FROM stripe_transactions st
   LEFT JOIN orders o ON o.stripe_payment_intent_id = st.stripe_payment_intent_id
   LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
   WHERE st.created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY st.created_at DESC
   LIMIT 1;
   ```

3. **Résultat attendu:**
   - ✅ `st.status` = `SUCCEEDED`
   - ✅ `o.order_number` existe (ex: `ORD-20260106-XXXX`)
   - ✅ `wt.amount` = montant net vendeur

---

### Test 2: Correction paiement orphelin
**Objectif:** Vérifier que la correction manuelle fonctionne

1. **Identifier un paiement orphelin:**
   ```sql
   SELECT 
     st.id,
     st.stripe_payment_intent_id,
     st.amount,
     st.product_id
   FROM stripe_transactions st
   LEFT JOIN orders o ON o.stripe_payment_intent_id = st.stripe_payment_intent_id
   WHERE st.status = 'SUCCEEDED'
     AND o.id IS NULL
     AND st.product_id IS NOT NULL
   LIMIT 1;
   ```

2. **Appliquer correction:**
   ```sql
   -- Remplacer <TRANSACTION_ID> par l'ID trouvé
   SELECT fix_orphan_payment('<TRANSACTION_ID>');
   ```

3. **Vérifier résultat:**
   ```sql
   SELECT 
     st.id,
     o.order_number,
     wt.amount
   FROM stripe_transactions st
   LEFT JOIN orders o ON o.stripe_payment_intent_id = st.stripe_payment_intent_id
   LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
   WHERE st.id = '<TRANSACTION_ID>';
   ```

4. **Résultat attendu:**
   - ✅ `order_number` créé
   - ✅ `amount` crédité dans wallet

---

### Test 3: Performance webhook
**Objectif:** Vérifier que le webhook répond rapidement

1. **Créer paiement test**
2. **Vérifier logs Supabase:**
   - Aller dans: Supabase Dashboard > Edge Functions > stripe-webhook > Logs
   - Chercher dernière exécution
   - Vérifier durée d'exécution: **< 2 secondes**

3. **Résultat attendu:**
   ```
   ✅ Order created: ORD-XXXX
   ✅ Wallet credited: 150.00 XOF
   Duration: 1.2s
   ```

---

## 📊 CRITÈRES DE SUCCÈS

### Niveau 1: CRITIQUE (doit être 100%)
- ✅ Tous les paiements SUCCEEDED ont une commande
- ✅ Tous les vendeurs sont crédités pour paiements SUCCEEDED
- ✅ Aucun paiement orphelin créé dans les dernières 24h

### Niveau 2: IMPORTANT (doit être >95%)
- ✅ Cohérence montants: Stripe amount = Order total
- ✅ Cohérence crédits: Seller net = Wallet credited
- ✅ Temps réponse webhook < 3s

### Niveau 3: OPTIMAL (doit être >90%)
- ✅ Correction automatique des orphelins fonctionne
- ✅ Pas d'erreurs dans logs Edge Functions
- ✅ Index de performance créés et utilisés

---

## 🚨 QUE FAIRE SI TESTS ÉCHOUENT ?

### Si test SQL trouve des orphelins:
```sql
-- Corriger automatiquement tous les orphelins des 30 derniers jours
SELECT fix_orphan_payment(id)
FROM stripe_transactions st
LEFT JOIN orders o ON o.stripe_payment_intent_id = st.stripe_payment_intent_id
WHERE st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '30 days'
  AND o.id IS NULL
  AND st.product_id IS NOT NULL;
```

### Si webhook ne crée pas commande:
1. Vérifier que [fix-payment-orphans.sql](fix-payment-orphans.sql) a été appliqué
2. Vérifier logs webhook: Dashboard > Edge Functions > stripe-webhook
3. Vérifier RPC functions existent:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%payment%';
   ```

### Si wallet non crédité:
1. Vérifier colonne `available_balance` existe:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'wallets' 
     AND column_name = 'available_balance';
   ```
2. Si manquante, appliquer [fix-critical-errors.sql](fix-critical-errors.sql)

---

## 📞 SUPPORT

Si les tests révèlent des problèmes:

1. **Capturer logs:**
   - Supabase Dashboard > SQL Editor > Historique requêtes
   - Edge Functions > stripe-webhook > Logs (dernières 24h)
   - Console navigateur (erreurs JavaScript)

2. **Informations à fournir:**
   - Résultats test SQL complet
   - ID transaction problématique
   - Logs webhook correspondants
   - Heure exacte du problème

3. **Actions immédiates:**
   - Appliquer corrections SQL si pas encore fait
   - Corriger orphelins avec `fix_orphan_payment()`
   - Vérifier configuration Stripe

---

## ✅ CHECKLIST FINALE

Avant de considérer le système OK:

- [ ] Test SQL exécuté: Taux réussite = 100%
- [ ] Test Frontend exécuté: 5/5 tests réussis
- [ ] Test paiement bout-en-bout réussi
- [ ] Aucun orphelin dans dernières 24h
- [ ] Webhook répond en < 3s
- [ ] Tous les vendeurs crédités correctement
- [ ] Logs sans erreur
- [ ] Performance satisfaisante

---

**📌 Note importante:** Les tests SQL sont **non-destructifs** - ils ne modifient aucune donnée, seulement diagnostic et simulation. Vous pouvez les exécuter autant de fois que nécessaire.
