# 🧪 GUIDE RAPIDE - TEST PAIEMENT STRIPE

## 🚀 Démarrage rapide

### 1. Prérequis
✅ Dépendances installées : `@stripe/stripe-js`, `@stripe/react-stripe-js`  
✅ Clé Stripe publique configurée dans `.env.local`  
✅ Supabase configuré  
✅ Migration SQL appliquée  
✅ Edge Functions déployées  

---

## 📝 ÉTAPES DE TEST

### Étape 1 : Démarrer l'application

```powershell
cd d:/224Solutions
npm run dev
```

### Étape 2 : Accéder à la page de test

Ouvrez votre navigateur et allez sur :
```
http://localhost:5173/test-stripe-payment
```

### Étape 3 : Se connecter

- Connectez-vous avec votre compte 224SOLUTIONS
- La page détectera automatiquement votre utilisateur

### Étape 4 : Configurer le test

1. **Montant** : Laissez 50000 GNF (ou modifiez)
2. **Vendeur** : Un vendeur sera automatiquement sélectionné (role="VENDOR")
3. Cliquez sur **"Démarrer le test"**

### Étape 5 : Entrer les informations de carte TEST

Utilisez ces cartes de test Stripe :

#### ✅ Paiement réussi
```
Numéro : 4242 4242 4242 4242
CVC : 123 (n'importe quel 3 chiffres)
Date : 12/25 (n'importe quelle date future)
Code postal : 12345
```

#### 🔐 Test 3D Secure
```
Numéro : 4000 0027 6000 3184
CVC : 123
Date : 12/25
```
> Une popup 3D Secure apparaîtra. Cliquez sur "Complete authentication"

#### ❌ Test paiement refusé
```
Numéro : 4000 0000 0000 0002
CVC : 123
Date : 12/25
```

### Étape 6 : Valider le paiement

1. Cliquez sur **"Payer"**
2. Attendez le traitement (2-3 secondes)
3. Vérifiez les résultats dans la section "Résultats du Test"

---

## ✅ VÉRIFICATIONS AUTOMATIQUES

La page de test vérifie automatiquement :

1. ✅ **Authentification** : Utilisateur connecté
2. ✅ **Vendeur** : Utilisateur avec role="VENDOR" trouvé
3. ✅ **PaymentIntent** : Création réussie
4. ✅ **Transaction DB** : Enregistrée dans `stripe_transactions`
5. ✅ **Commission** : Calculée correctement
6. ✅ **Wallet** : Mis à jour après paiement

---

## 📊 RÉSULTATS ATTENDUS

### Paiement réussi ✅

```
✅ Authentification - Connecté en tant que user@email.com
✅ Vendeur - Vendeur trouvé : Nom Vendeur
✅ Test démarré - Montant : 50000 GNF
✅ Paiement - Paiement réussi ! PaymentIntent: pi_xxxxx
✅ Base de données - Transaction trouvée : uuid-transaction
✅ Commission - Commission calculée : 5000 gnf (10%)
⏳ Wallet - Vérification du wallet en cours...
```

### Vérification en base de données

```sql
-- Vérifier la transaction créée
SELECT * FROM stripe_transactions 
WHERE payment_intent_id = 'pi_xxxxx';

-- Résultat attendu :
{
  id: uuid,
  buyer_id: uuid_user,
  seller_id: uuid_vendeur,
  amount: 50000,
  currency: 'gnf',
  commission_rate: 10.00,
  commission_amount: 5000,
  seller_net_amount: 45000,
  status: 'SUCCEEDED',
  payment_intent_id: 'pi_xxxxx',
  ...
}
```

### Vérification du wallet vendeur

```sql
-- Vérifier que le wallet a été crédité
SELECT * FROM wallets 
WHERE user_id = 'uuid_vendeur';

-- Résultat attendu :
{
  available_balance: 45000, -- Montant net après commission
  pending_balance: 0,
  frozen_balance: 0,
  ...
}

-- Vérifier les transactions wallet
SELECT * FROM wallet_transactions 
WHERE wallet_id = 'uuid_wallet'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔧 DÉPANNAGE

### Problème : "Stripe publishable key not configured"

**Solution :**
```powershell
# Vérifier .env.local
cat .env.local

# S'assurer que cette ligne existe :
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Problème : "Aucun vendeur trouvé"

**Solution :**
```sql
-- Créer un vendeur de test
UPDATE profiles 
SET role = 'VENDOR'
WHERE id = 'UUID_UTILISATEUR';
```

### Problème : "Failed to create payment intent"

**Causes possibles :**
1. Edge Function `create-payment-intent` non déployée
2. Secret key Stripe non configurée

**Solution :**
```powershell
# Déployer la fonction
supabase functions deploy create-payment-intent

# Configurer les secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
```

### Problème : Wallet non mis à jour après paiement

**Vérification :**
```sql
-- Tester manuellement
SELECT process_successful_payment('UUID_TRANSACTION');
```

**Solution :**
```powershell
# Vérifier les logs webhook
supabase functions logs stripe-webhook

# Redéployer si nécessaire
supabase functions deploy stripe-webhook
```

---

## 📱 TEST COMPLET (Checklist)

- [ ] Page de test accessible (`/test-stripe-payment`)
- [ ] Utilisateur connecté
- [ ] Vendeur trouvé automatiquement
- [ ] Carte test **4242 4242 4242 4242** fonctionne
- [ ] Transaction créée avec status="SUCCEEDED"
- [ ] Commission calculée (10% par défaut)
- [ ] Wallet vendeur crédité (+45000 GNF pour 50000 GNF)
- [ ] Transaction wallet créée (type="PAYMENT_RECEIVED")
- [ ] Aucune erreur dans la console
- [ ] Toast de succès affiché
- [ ] Résultats de test affichés

---

## 🎯 TESTS AVANCÉS

### Test 1 : Montants différents

```
Testez avec : 10000, 50000, 100000, 500000 GNF
Vérifiez que la commission est toujours 10%
```

### Test 2 : 3D Secure

```
Carte : 4000 0027 6000 3184
Vérifiez que la popup 3DS s'affiche
Cliquez sur "Complete authentication"
Vérifiez que le paiement aboutit
```

### Test 3 : Paiement refusé

```
Carte : 4000 0000 0000 0002
Vérifiez que l'erreur est affichée
Vérifiez que status="FAILED" en DB
```

### Test 4 : Webhooks

```powershell
# Terminal 1 : Écouter les webhooks
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# Terminal 2 : Déclencher un événement
stripe trigger payment_intent.succeeded
```

---

## 📚 DOCUMENTATION COMPLÈTE

Pour aller plus loin :
- [STRIPE_PAYMENT_DEPLOYMENT_GUIDE.md](./STRIPE_PAYMENT_DEPLOYMENT_GUIDE.md)
- [STRIPE_PAYMENT_README.md](./STRIPE_PAYMENT_README.md)
- [STRIPE_PAYMENT_USAGE_EXAMPLES.tsx](./STRIPE_PAYMENT_USAGE_EXAMPLES.tsx)

---

## 🆘 SUPPORT

Si le test échoue après avoir suivi ce guide :
1. Vérifier les logs : `supabase functions logs`
2. Vérifier la console navigateur (F12)
3. Vérifier que la migration SQL est appliquée
4. Consulter [STRIPE_PAYMENT_DEPLOYMENT_GUIDE.md](./STRIPE_PAYMENT_DEPLOYMENT_GUIDE.md)

---

**Temps estimé du test complet :** 5-10 minutes  
**Difficulté :** Facile  
**Prérequis :** Application démarrée + utilisateur connecté

🎉 **Bon test !**
