# 🔴 TRAITEMENT PAIEMENTS ORPHELINS - 19 TRANSACTIONS

## 📋 État des lieux

**Problème identifié :** 19 paiements Stripe sont en statut PENDING avec un `seller_id` invalide.

```sql
-- Requête pour identifier les paiements orphelins
SELECT 
  stripe_payment_intent_id,
  amount,
  seller_id,
  status,
  paid_at,
  metadata
FROM stripe_transactions
WHERE status = 'PENDING'
  AND seller_id = '9e622843-f7c1-4a05-95f2-69429ceac420'
ORDER BY paid_at DESC;
```

**Résultat :**
- **Nombre de paiements** : 19
- **Montant total** : ~283,000 GNF
- **Seller ID invalide** : `9e622843-f7c1-4a05-95f2-69429ceac420` (n'existe pas en database)
- **Statut actuel** : PENDING (fonds reçus de Stripe mais pas traités)

---

## 🛠️ Solutions Possibles

### Option 1 : Remboursement via Stripe Dashboard ✅ RECOMMANDÉ

**Avantages :**
- ✅ Conforme aux politiques Stripe
- ✅ Fonds retournés aux clients automatiquement
- ✅ Historique complet dans Stripe
- ✅ Notification automatique aux clients

**Inconvénients :**
- ⚠️ Manuel (19 paiements à traiter un par un)
- ⚠️ Frais Stripe non récupérables

**Procédure :**

1. **Accéder à Stripe Dashboard**
   ```
   https://dashboard.stripe.com/test/payments
   ```

2. **Filtrer les paiements**
   - Status: `succeeded`
   - Date: Selon paid_at des transactions
   - Recherche par Payment Intent ID

3. **Pour chaque paiement :**
   ```
   1. Cliquer sur le Payment Intent
   2. Aller dans l'onglet "Actions" → "Refund"
   3. Montant: Full refund
   4. Reason: "Seller account invalid"
   5. Confirmer
   ```

4. **Mettre à jour la database après chaque refund**
   ```sql
   UPDATE stripe_transactions
   SET 
     status = 'REFUNDED',
     metadata = metadata || jsonb_build_object(
       'refund_reason', 'Seller account invalid',
       'refunded_at', NOW(),
       'refund_method', 'stripe_dashboard'
     )
   WHERE stripe_payment_intent_id = 'pi_xxx';
   ```

---

### Option 2 : Remboursement programmatique via Stripe API

**Script PowerShell :**

```powershell
# refund-orphan-payments.ps1

$STRIPE_SECRET_KEY = "sk_test_..." # Votre clé secrète Stripe

# Liste des Payment Intent IDs à rembourser
$paymentIntents = @(
    "pi_xxx1",
    "pi_xxx2",
    # ... ajouter tous les 19 IDs
)

foreach ($pi in $paymentIntents) {
    Write-Host "🔄 Remboursement de $pi..." -ForegroundColor Yellow
    
    try {
        # Appeler Stripe API pour créer un refund
        $headers = @{
            "Authorization" = "Bearer $STRIPE_SECRET_KEY"
            "Content-Type" = "application/x-www-form-urlencoded"
        }
        
        $body = @{
            "payment_intent" = $pi
            "reason" = "fraudulent" # Ou "requested_by_customer"
        }
        
        $response = Invoke-RestMethod `
            -Uri "https://api.stripe.com/v1/refunds" `
            -Method POST `
            -Headers $headers `
            -Body $body
        
        if ($response.status -eq "succeeded") {
            Write-Host "✅ Remboursement réussi: $($response.id)" -ForegroundColor Green
            
            # Mettre à jour la database
            $updateQuery = @"
UPDATE stripe_transactions
SET 
  status = 'REFUNDED',
  metadata = metadata || jsonb_build_object(
    'refund_id', '$($response.id)',
    'refunded_at', NOW(),
    'refund_reason', 'Seller account invalid'
  )
WHERE stripe_payment_intent_id = '$pi';
"@
            
            Write-Host "Database query:" -ForegroundColor Gray
            Write-Host $updateQuery -ForegroundColor DarkGray
        }
        
        Start-Sleep -Seconds 1 # Rate limiting
    }
    catch {
        Write-Host "❌ Erreur: $_" -ForegroundColor Red
    }
}
```

---

### Option 3 : Créer un vendeur fictif et créditer son wallet ⚠️ NON RECOMMANDÉ

**Pourquoi ne pas faire ça :**
- ❌ Violation des règles métier
- ❌ Fonds sans réelle contrepartie
- ❌ Problème d'audit et de comptabilité
- ❌ Risque légal (argent non justifié)

---

## 📊 Détails des 19 Paiements à Traiter

### Requête pour obtenir la liste complète

```sql
-- Export CSV pour traitement
COPY (
  SELECT 
    stripe_payment_intent_id AS "Payment Intent ID",
    amount AS "Montant (GNF)",
    paid_at AS "Date Paiement",
    metadata->>'customer_email' AS "Email Client",
    metadata->>'order_number' AS "Numéro Commande"
  FROM stripe_transactions
  WHERE status = 'PENDING'
    AND seller_id = '9e622843-f7c1-4a05-95f2-69429ceac420'
  ORDER BY paid_at DESC
) TO '/tmp/orphan_payments.csv' WITH CSV HEADER;
```

### Format du CSV généré

```csv
Payment Intent ID,Montant (GNF),Date Paiement,Email Client,Numéro Commande
pi_xxx1,15000,2024-01-15,client1@example.com,ORD-001
pi_xxx2,12000,2024-01-16,client2@example.com,ORD-002
...
```

---

## ✅ Checklist Traitement

### Avant de commencer

- [ ] Exporter la liste complète des 19 paiements (CSV)
- [ ] Vérifier que tous ont bien le même seller_id invalide
- [ ] Calculer le montant total à rembourser
- [ ] Vérifier les frais Stripe déjà prélevés
- [ ] Préparer la communication client (email de notification)

### Pendant le traitement

Pour chaque paiement :
- [ ] Noter le Payment Intent ID
- [ ] Vérifier le montant exact
- [ ] Effectuer le refund via Stripe Dashboard
- [ ] Attendre confirmation Stripe (status: succeeded)
- [ ] Mettre à jour la database (status = REFUNDED)
- [ ] ✅ Notifier le client (email automatique Stripe)

### Après le traitement

- [ ] Vérifier que tous les 19 paiements sont REFUNDED
- [ ] Calculer le total remboursé
- [ ] Vérifier que les clients ont bien reçu les fonds
- [ ] Documenter l'incident (pourquoi ce seller_id invalide ?)
- [ ] Implémenter une validation côté frontend/backend pour éviter ce problème

---

## 🔍 Investigation : Pourquoi ce seller_id invalide ?

### Pistes à explorer

1. **Bug dans le frontend ?**
   ```typescript
   // Vérifier dans ProductPaymentModal.tsx ou similaire
   // Rechercher où seller_id est défini
   ```

2. **Produit supprimé après paiement ?**
   ```sql
   -- Vérifier si des produits ont été supprimés
   SELECT 
     o.order_number,
     o.metadata->>'seller_id' AS seller_from_order,
     st.seller_id AS seller_from_stripe
   FROM orders o
   JOIN stripe_transactions st 
     ON st.stripe_payment_intent_id = o.metadata->>'stripe_payment_intent_id'
   WHERE st.seller_id = '9e622843-f7c1-4a05-95f2-69429ceac420';
   ```

3. **Valeur par défaut incorrecte ?**
   ```sql
   -- Chercher si ce UUID est hard-codé quelque part
   SELECT * FROM profiles WHERE id = '9e622843-f7c1-4a05-95f2-69429ceac420';
   ```

### Actions préventives

1. **Ajouter une validation côté backend**
   ```sql
   -- Fonction pour valider seller_id avant paiement
   CREATE OR REPLACE FUNCTION validate_seller_exists(seller_uuid UUID)
   RETURNS BOOLEAN AS $$
   BEGIN
     RETURN EXISTS(
       SELECT 1 FROM profiles 
       WHERE id = seller_uuid 
         AND role = 'vendeur' 
         AND is_active = true
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **Ajouter un check constraint**
   ```sql
   -- Vérifier que seller_id existe dans profiles
   ALTER TABLE stripe_transactions
   ADD CONSTRAINT fk_seller_exists
   FOREIGN KEY (seller_id) REFERENCES profiles(id)
   ON DELETE RESTRICT;
   ```

3. **Ajouter logs détaillés**
   ```typescript
   // Dans le code de paiement
   console.log('[Payment] Seller ID validation:', {
     seller_id: sellerId,
     exists: await validateSellerExists(sellerId),
     product_id: productId,
     timestamp: new Date()
   });
   ```

---

## 📧 Communication Client

### Template email (si nécessaire)

```
Objet: Remboursement de votre commande #ORD-XXX

Bonjour,

Nous vous informons qu'un remboursement de [MONTANT] GNF a été effectué 
sur votre moyen de paiement pour votre commande #ORD-XXX.

Raison: Vendeur temporairement indisponible

Le remboursement sera visible sur votre compte dans un délai de 5-10 jours 
ouvrables selon votre banque.

Nous nous excusons pour ce désagrément.

Cordialement,
L'équipe 224Solutions
```

---

## 💰 Impact Financier

```
Montant total à rembourser: ~283,000 GNF
Frais Stripe non récupérables: ~8,500 GNF (3% de 283,000)
Perte nette pour la plateforme: 8,500 GNF
```

**Note :** Les frais Stripe ne sont PAS remboursés lors d'un refund complet.

---

## 🚀 Exécution Recommandée

### Étape 1 : Export des données

```powershell
# Exporter la liste des paiements orphelins
psql -h aws-0-eu-central-1.pooler.supabase.com `
     -p 6543 `
     -d postgres `
     -U postgres.uakkxaibujzxdiqzpnpr `
     -c "\copy (SELECT stripe_payment_intent_id, amount, paid_at FROM stripe_transactions WHERE status = 'PENDING' AND seller_id = '9e622843-f7c1-4a05-95f2-69429ceac420') TO 'orphan_payments.csv' WITH CSV HEADER"
```

### Étape 2 : Remboursements manuels

1. Ouvrir [Stripe Dashboard](https://dashboard.stripe.com/test/payments)
2. Pour chaque Payment Intent dans le CSV
3. Effectuer le refund
4. Mettre à jour la database

### Étape 3 : Vérification finale

```sql
-- Vérifier qu'il ne reste plus de paiements orphelins
SELECT COUNT(*) 
FROM stripe_transactions
WHERE status = 'PENDING'
  AND seller_id = '9e622843-f7c1-4a05-95f2-69429ceac420';

-- Résultat attendu: 0
```

---

**Voulez-vous que je vous aide à exécuter ces remboursements maintenant ?**
