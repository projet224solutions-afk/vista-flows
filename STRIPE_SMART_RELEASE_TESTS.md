# 🧪 GUIDE DE TESTS - SYSTÈME DE DÉBLOCAGE INTELLIGENT

## 📋 Vue d'ensemble

Ce guide fournit des scénarios de tests détaillés pour valider le système de déblocage intelligent des fonds.

---

## ✅ PRÉ-REQUIS

Avant de commencer les tests :

- [ ] Migration SQL appliquée (`20260106000000_smart_funds_release.sql`)
- [ ] Edge Functions déployées (assess-payment-risk, release-scheduled-funds, admin-review-payment)
- [ ] CRON job configuré (toutes les 5 minutes)
- [ ] Variables d'environnement configurées (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CRON_SECRET)
- [ ] Webhook Stripe configuré pour pointer vers votre Edge Function
- [ ] Clés Stripe en mode Test activées

---

## 🧪 SCÉNARIO 1: PAIEMENT LOW RISK (Auto-Approuvé)

### Objectif
Vérifier qu'un paiement à faible risque est automatiquement approuvé avec smart delay.

### Conditions
- **Vendeur**: Compte créé il y a >30 jours, KYC vérifié
- **Acheteur**: Compte existant avec historique de paiements
- **Carte**: Déjà utilisée plusieurs fois sans litiges
- **Montant**: Dans la moyenne des transactions du vendeur

### Steps

1. **Créer un Payment Intent**
   ```typescript
   const paymentIntent = await stripe.paymentIntents.create({
     amount: 5000, // 50 XOF
     currency: 'xof',
     metadata: {
       buyer_id: 'uuid-buyer',
       seller_id: 'uuid-seller-verified',
       source: 'marketplace'
     }
   });
   ```

2. **Confirmer le paiement**
   ```typescript
   await stripe.paymentIntents.confirm(paymentIntent.id, {
     payment_method: 'pm_card_visa'
   });
   ```

3. **Vérifier le webhook**
   - Le webhook `payment_intent.succeeded` doit être reçu
   - Le webhook doit appeler `assess-payment-risk`

4. **Vérifier la base de données**
   ```sql
   -- Vérifier le Trust Score
   SELECT trust_score, risk_level, decision, random_review
   FROM payment_risk_assessments
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - `trust_score` ≥ 80
   - `risk_level` = 'LOW'
   - `decision` = 'AUTO_APPROVED'
   - `random_review` = false (dans 97% des cas)

5. **Vérifier la planification**
   ```sql
   SELECT status, scheduled_release_at, amount_to_release
   FROM funds_release_schedule
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - `status` = 'SCHEDULED'
   - `scheduled_release_at` = NOW() + 30 à 60 minutes
   - `amount_to_release` = montant net vendeur

6. **Vérifier le wallet**
   ```sql
   SELECT pending_balance, available_balance
   FROM wallets
   WHERE user_id = 'uuid-seller-verified';
   ```
   
   **Résultat attendu:**
   - `pending_balance` augmenté du montant net
   - `available_balance` inchangé (pour l'instant)

7. **Attendre la libération automatique**
   - Attendre l'expiration du smart delay (30-60 min)
   - Le CRON job `release-scheduled-funds` doit s'exécuter
   
8. **Vérifier la libération**
   ```sql
   SELECT status, released_at
   FROM funds_release_schedule
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - `status` = 'RELEASED'
   - `released_at` renseigné

9. **Vérifier le wallet après libération**
   ```sql
   SELECT pending_balance, available_balance
   FROM wallets
   WHERE user_id = 'uuid-seller-verified';
   ```
   
   **Résultat attendu:**
   - `pending_balance` diminué du montant
   - `available_balance` augmenté du montant

### ✅ Critères de succès
- Trust Score calculé correctement
- Paiement AUTO_APPROVED
- Fonds en pending_balance
- Libération automatique après le délai
- Fonds disponibles dans available_balance

---

## 🧪 SCÉNARIO 2: PAIEMENT MEDIUM RISK (Review Admin)

### Objectif
Vérifier qu'un paiement à risque moyen nécessite une validation admin.

### Conditions
- **Vendeur**: Compte créé il y a 15 jours, KYC non vérifié
- **Acheteur**: Premier achat
- **Carte**: Première utilisation
- **Montant**: Légèrement supérieur à la moyenne

### Steps

1. **Créer et confirmer le paiement** (comme Scénario 1)

2. **Vérifier le Trust Score**
   ```sql
   SELECT trust_score, risk_level, decision
   FROM payment_risk_assessments
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - `trust_score` entre 50 et 79
   - `risk_level` = 'MEDIUM' ou 'HIGH'
   - `decision` = 'ADMIN_REVIEW'

3. **Vérifier la file d'attente admin**
   ```sql
   SELECT * FROM admin_payment_review_queue
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - Paiement visible dans la vue
   - `release_status` = 'PENDING'

4. **Tester l'interface admin**
   - Accéder à `/admin/payment-review`
   - Vérifier que le paiement apparaît dans la liste
   - Cliquer sur "Approuver"
   - Ajouter une note (optionnel)
   - Confirmer l'approbation

5. **Vérifier l'approbation**
   ```sql
   SELECT status, released_at, approved_by, notes
   FROM funds_release_schedule
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - `status` = 'RELEASED'
   - `released_at` renseigné
   - `approved_by` = UUID de l'admin
   - `notes` = note saisie

6. **Vérifier la notification vendeur**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = 'uuid-seller'
     AND type = 'PAYMENT_APPROVED'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### ✅ Critères de succès
- Paiement mis en ADMIN_REVIEW
- Visible dans l'interface admin
- Approbation manuelle fonctionne
- Fonds libérés immédiatement après approbation
- Notification envoyée au vendeur

---

## 🧪 SCÉNARIO 3: PAIEMENT HIGH RISK (Bloqué)

### Objectif
Vérifier qu'un paiement à haut risque est automatiquement bloqué.

### Conditions
- **Vendeur**: Compte créé il y a 5 jours (< 7 jours)
- **Acheteur**: N'importe
- **Montant**: 10x la moyenne du vendeur

### Steps

1. **Créer et confirmer le paiement**

2. **Vérifier le blocage automatique**
   ```sql
   SELECT trust_score, decision, auto_blocked, block_reasons
   FROM payment_risk_assessments
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - `trust_score` = 0
   - `decision` = 'BLOCKED'
   - `auto_blocked` = true
   - `block_reasons` contient "Vendeur créé il y a moins de 7 jours" ou "Montant 5x supérieur"

3. **Vérifier les signaux de fraude**
   ```sql
   SELECT signal_type, severity, description
   FROM payment_fraud_signals
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - Au moins un signal créé (NEW_SELLER ou UNUSUAL_AMOUNT)
   - `severity` ≥ 8

4. **Vérifier qu'aucun fond n'est crédité**
   ```sql
   SELECT COUNT(*) FROM funds_release_schedule
   WHERE transaction_id = (
     SELECT id FROM stripe_transactions 
     WHERE stripe_payment_intent_id = 'pi_xxx'
   );
   ```
   
   **Résultat attendu:**
   - COUNT = 0 (aucune planification créée)

5. **Vérifier le wallet vendeur**
   ```sql
   SELECT pending_balance, available_balance
   FROM wallets
   WHERE user_id = 'uuid-new-seller';
   ```
   
   **Résultat attendu:**
   - Aucun changement de balance

### ✅ Critères de succès
- Paiement BLOCKED automatiquement
- Aucun fond crédité
- Signaux de fraude créés
- Admin alerté

---

## 🧪 SCÉNARIO 4: CONTRÔLE ALÉATOIRE (3%)

### Objectif
Vérifier que 3% des paiements AUTO_APPROVED sont forcés en ADMIN_REVIEW.

### Conditions
- **Vendeur**: Conditions idéales (Trust Score ≥ 80)
- **Objectif**: Créer 100 paiements, ~3 devraient être en ADMIN_REVIEW

### Steps

1. **Créer 100 paiements identiques**
   ```typescript
   for (let i = 0; i < 100; i++) {
     // Créer et confirmer un paiement
   }
   ```

2. **Compter les contrôles aléatoires**
   ```sql
   SELECT 
     COUNT(*) as total,
     SUM(CASE WHEN random_review THEN 1 ELSE 0 END) as random_reviews,
     (SUM(CASE WHEN random_review THEN 1 ELSE 0 END)::float / COUNT(*) * 100) as percentage
   FROM payment_risk_assessments
   WHERE created_at > NOW() - INTERVAL '1 hour'
     AND trust_score >= 80;
   ```
   
   **Résultat attendu:**
   - `percentage` ≈ 3% (± 2%)

3. **Vérifier que les paiements random sont en ADMIN_REVIEW**
   ```sql
   SELECT decision, random_review
   FROM payment_risk_assessments
   WHERE random_review = true
     AND created_at > NOW() - INTERVAL '1 hour';
   ```
   
   **Résultat attendu:**
   - Tous ont `decision` = 'ADMIN_REVIEW'

### ✅ Critères de succès
- ~3% des paiements AUTO_APPROVED sont forcés en review
- Flag `random_review` = true
- Paiements visibles dans la file admin

---

## 🧪 SCÉNARIO 5: REJET DE PAIEMENT ET REMBOURSEMENT

### Objectif
Vérifier que le rejet d'un paiement déclenche un remboursement Stripe.

### Steps

1. **Créer un paiement en ADMIN_REVIEW**

2. **Accéder à l'interface admin**
   - Ouvrir `/admin/payment-review`
   - Sélectionner le paiement
   - Cliquer sur "Rejeter"

3. **Remplir la raison de rejet**
   ```
   Raison: "Activité suspecte détectée - Montant anormal pour un nouveau compte"
   ```

4. **Confirmer le rejet**

5. **Vérifier le statut**
   ```sql
   SELECT status, rejected_by, rejection_reason
   FROM funds_release_schedule
   WHERE id = 'uuid-release';
   ```
   
   **Résultat attendu:**
   - `status` = 'REJECTED'
   - `rejected_by` = UUID admin
   - `rejection_reason` renseigné

6. **Vérifier le remboursement Stripe**
   ```typescript
   const refunds = await stripe.refunds.list({
     payment_intent: 'pi_xxx'
   });
   ```
   
   **Résultat attendu:**
   - Un refund existe
   - `refund.status` = 'succeeded'

7. **Vérifier la transaction**
   ```sql
   SELECT payment_status, refunded_at
   FROM stripe_transactions
   WHERE stripe_payment_intent_id = 'pi_xxx';
   ```
   
   **Résultat attendu:**
   - `payment_status` = 'REFUNDED'
   - `refunded_at` renseigné

8. **Vérifier les notifications**
   ```sql
   -- Notification vendeur
   SELECT * FROM notifications
   WHERE user_id = 'uuid-seller'
     AND type = 'PAYMENT_REJECTED';
   
   -- Notification acheteur
   SELECT * FROM notifications
   WHERE user_id = 'uuid-buyer'
     AND type = 'PAYMENT_REFUNDED';
   ```

### ✅ Critères de succès
- Rejet enregistré correctement
- Remboursement Stripe créé
- Transaction marquée REFUNDED
- Notifications envoyées aux deux parties

---

## 🧪 SCÉNARIO 6: CRON JOB DE LIBÉRATION

### Objectif
Vérifier que le CRON job libère automatiquement les fonds planifiés.

### Steps

1. **Créer plusieurs paiements AUTO_APPROVED** avec des délais courts

2. **Modifier manuellement les délais** (pour accélérer les tests)
   ```sql
   UPDATE funds_release_schedule
   SET scheduled_release_at = NOW() + INTERVAL '1 minute'
   WHERE status = 'SCHEDULED';
   ```

3. **Attendre 5-10 minutes** (le CRON s'exécute toutes les 5 minutes)

4. **Vérifier les logs du CRON job**
   - Aller sur Supabase Dashboard > Edge Functions > release-scheduled-funds > Logs

5. **Vérifier les libérations**
   ```sql
   SELECT 
     id,
     transaction_id,
     scheduled_release_at,
     released_at,
     status
   FROM funds_release_schedule
   WHERE scheduled_release_at <= NOW()
     AND status IN ('RELEASED', 'SCHEDULED')
   ORDER BY scheduled_release_at DESC;
   ```
   
   **Résultat attendu:**
   - Toutes les releases avec `scheduled_release_at` passé ont `status` = 'RELEASED'

6. **Vérifier les wallets**
   ```sql
   SELECT user_id, pending_balance, available_balance
   FROM wallets
   WHERE user_id IN (
     SELECT seller_id FROM stripe_transactions
     WHERE id IN (
       SELECT transaction_id FROM funds_release_schedule
       WHERE status = 'RELEASED'
         AND released_at > NOW() - INTERVAL '10 minutes'
     )
   );
   ```

### ✅ Critères de succès
- CRON job s'exécute toutes les 5 minutes
- Fonds libérés automatiquement après expiration
- Wallets mis à jour correctement
- Notifications envoyées

---

## 📊 RAPPORT DE TESTS

Après avoir exécuté tous les scénarios, remplir ce rapport :

### Tests Fonctionnels
- [ ] Scénario 1: Paiement LOW RISK (Auto-Approuvé) ✅ / ❌
- [ ] Scénario 2: Paiement MEDIUM RISK (Review Admin) ✅ / ❌
- [ ] Scénario 3: Paiement HIGH RISK (Bloqué) ✅ / ❌
- [ ] Scénario 4: Contrôle Aléatoire (3%) ✅ / ❌
- [ ] Scénario 5: Rejet et Remboursement ✅ / ❌
- [ ] Scénario 6: CRON Job Libération ✅ / ❌

### Tests de Performance
- [ ] 100 paiements simultanés traités sans erreur ✅ / ❌
- [ ] Temps de traitement webhook < 5 secondes ✅ / ❌
- [ ] CRON job traite 50+ libérations en < 1 minute ✅ / ❌

### Tests de Sécurité
- [ ] Vérification signature webhook Stripe ✅ / ❌
- [ ] Double vérification avec API Stripe ✅ / ❌
- [ ] RLS policies fonctionnent (vendeurs voient uniquement leurs données) ✅ / ❌
- [ ] Admins seuls peuvent approuver/rejeter ✅ / ❌

### Tests d'Interface
- [ ] PaymentReviewQueue affiche correctement les paiements ✅ / ❌
- [ ] Actions admin (approuver/rejeter) fonctionnent ✅ / ❌
- [ ] FundsReleaseStatus affiche le statut vendeur ✅ / ❌
- [ ] Notifications en temps réel ✅ / ❌

---

## 🐛 PROBLÈMES COURANTS

### Problème: Trust Score toujours 0
**Solution:** Vérifier que les données utilisateurs existent (profiles, vendor_kyc, historique transactions)

### Problème: CRON job ne libère pas les fonds
**Solution:** 
- Vérifier que le CRON est configuré
- Vérifier les logs Edge Function
- Vérifier que `scheduled_release_at` est dans le passé

### Problème: Webhook ne déclenche pas assess-payment-risk
**Solution:**
- Vérifier que le webhook Stripe est configuré
- Vérifier les logs du webhook
- Vérifier que SUPABASE_URL est accessible depuis Stripe

### Problème: Admin ne peut pas approuver
**Solution:**
- Vérifier que le rôle utilisateur est 'ADMIN'
- Vérifier les RLS policies
- Vérifier les logs Edge Function admin-review-payment

---

## 📈 MÉTRIQUES À SURVEILLER

Après mise en production, monitorer ces métriques :

1. **Taux d'auto-approbation:** % de paiements AUTO_APPROVED
   - Objectif: > 90%

2. **Délai moyen de libération:** Temps entre paiement et disponibilité fonds
   - Objectif: 30-120 minutes pour AUTO_APPROVED

3. **Taux de contrôle aléatoire:** % de paiements forcés en review
   - Objectif: 3% (± 1%)

4. **Temps de traitement admin:** Délai entre ADMIN_REVIEW et décision
   - Objectif: < 24 heures

5. **Taux de blocage:** % de paiements BLOCKED
   - Surveiller les faux positifs

6. **Taux de fraude détecté:** Paiements rejetés / Total paiements
   - Benchmark: < 1%

---

**Date:** 2026-01-06  
**Version:** 1.0.0  
**Auteur:** GitHub Copilot
