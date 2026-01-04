# 🧪 GUIDE DE TEST - PAIEMENT DJOMY

## 📋 PRÉ-REQUIS

Avant de tester, assurez-vous que :

- ✅ Les vrais credentials Djomy sont configurés (voir [DJOMY_CREDENTIALS_GUIDE.md](./DJOMY_CREDENTIALS_GUIDE.md))
- ✅ Les secrets Supabase sont définis (`DJOMY_CLIENT_ID`, `DJOMY_CLIENT_SECRET`)
- ✅ Les Edge Functions sont déployées (`djomy-init-payment`, `djomy-webhook`)
- ✅ Vous avez un compte Orange Money ou MTN MoMo avec crédit suffisant

---

## 🚀 TEST 1: PAIEMENT DEPUIS POS VENDEUR

### Étape 1: Se connecter comme vendeur

1. **Ouvrez l'application :** http://localhost:3001
2. **Connectez-vous** avec un compte vendeur
3. **Accédez au POS** : Menu → Point de Vente

### Étape 2: Créer une commande test

1. **Ajoutez un produit** au panier (ex: 1 article à 1000 GNF)
2. **Cliquez sur** le bouton **Panier** (en bas sur mobile)
3. **Vérifiez** que le total s'affiche correctement

### Étape 3: Initialiser le paiement Mobile Money

1. **Sélectionnez** "Mobile Money" comme méthode de paiement
2. **Choisissez** le provider :
   - 🍊 **Orange Money** (Orange Guinea)
   - 💛 **MTN Mobile Money** (MTN Guinea)
3. **Entrez** votre numéro de téléphone (9 chiffres, sans +224)
   - Exemple : `621234567` (Orange)
   - Exemple : `661234567` (MTN)
4. **Cliquez** sur **"Valider la commande"**

### Étape 4: Confirmer sur votre téléphone

1. **Vous recevrez** un USSD/push notification sur votre téléphone
2. **Tapez** votre code PIN Mobile Money
3. **Confirmez** le paiement

### Étape 5: Vérifier le résultat

**Dans l'application :**
- ✅ Message de succès affiché
- ✅ Commande créée avec statut "Processing"
- ✅ Panier vidé automatiquement

**Dans Supabase Dashboard :**
```sql
-- Voir la transaction
SELECT * FROM djomy_transactions 
ORDER BY created_at DESC 
LIMIT 1;

-- Statut attendu: PROCESSING ou SUCCESS
```

---

## 🚀 TEST 2: RECHARGE WALLET

### Étape 1: Accéder au Wallet

1. **Menu** → **Wallet** (ou **Portefeuille**)
2. **Cliquez** sur **"Recharger"** ou **"Déposer"**

### Étape 2: Choisir Mobile Money

1. **Sélectionnez** "Mobile Money"
2. **Choisissez** le provider (Orange ou MTN)
3. **Entrez** le montant (minimum 1000 GNF)
4. **Entrez** votre numéro de téléphone
5. **Validez**

### Étape 3: Confirmer et vérifier

- Même processus que le TEST 1
- ✅ Le wallet doit être crédité après confirmation

---

## 🔍 TESTS AVANCÉS

### Test 3: Montants divers

Testez avec différents montants :
- ✅ **100 GNF** (minimum)
- ✅ **1,000 GNF**
- ✅ **10,000 GNF**
- ✅ **100,000 GNF**

### Test 4: Différents providers

- ✅ **Orange Money** (prefixe 6XX)
- ✅ **MTN Mobile Money** (prefixe 6XX)

### Test 5: Cas d'erreurs

**Numéro invalide :**
```
Attendu: Message d'erreur "Numéro de téléphone invalide"
```

**Fonds insuffisants :**
```
Attendu: Message d'erreur depuis Djomy "Solde insuffisant"
```

**Annulation :**
```
1. Initiez un paiement
2. Annulez depuis votre téléphone (timeout ou refus)
Attendu: Transaction marquée "CANCELLED" ou "TIMEOUT"
```

---

## 📊 VÉRIFICATION DANS LA BASE DE DONNÉES

### Transactions récentes
```sql
SELECT 
  id,
  order_id,
  amount,
  payment_method,
  status,
  djomy_transaction_id,
  created_at,
  completed_at
FROM djomy_transactions
ORDER BY created_at DESC
LIMIT 10;
```

### Logs API Djomy
```sql
SELECT 
  id,
  request_type,
  response_status,
  duration_ms,
  error_message,
  created_at
FROM djomy_api_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Statut attendu par étape
- **PENDING** → Paiement initié, pas encore envoyé à Djomy
- **PROCESSING** → Envoyé à Djomy, en attente confirmation utilisateur
- **SUCCESS** → Paiement confirmé et validé
- **FAILED** → Échec du paiement
- **CANCELLED** → Annulé par l'utilisateur
- **TIMEOUT** → Pas de réponse dans le délai imparti

---

## 🐛 TROUBLESHOOTING

### Erreur 403 "Access Forbidden"

**Cause possible :**
- Credentials invalides
- Format Client ID incorrect (doit être `djomy-merchant-*`)

**Solution :**
```bash
# Vérifier les secrets Supabase
supabase secrets list

# Reconfigurer si nécessaire
./configure-djomy-secrets.ps1
```

### Erreur "Token generation failed"

**Cause possible :**
- Endpoint auth incorrect
- Credentials sandbox utilisés en production

**Solution :**
1. Vérifiez que `useSandbox: false` dans le code
2. Vérifiez les credentials production dans Supabase

### Transaction bloquée en "PROCESSING"

**Cause possible :**
- Webhook non configuré
- Utilisateur n'a pas confirmé sur son téléphone

**Solution :**
1. Configurez le webhook Djomy :
   ```
   https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/djomy-webhook
   ```
2. Vérifiez les logs webhook :
   ```bash
   supabase functions logs djomy-webhook
   ```

### Logs des Edge Functions

**Voir les logs en temps réel :**
```bash
# Paiement
supabase functions logs djomy-init-payment --follow

# Webhook
supabase functions logs djomy-webhook --follow
```

---

## ✅ CRITÈRES DE SUCCÈS

### Test réussi si :

1. ✅ **Transaction créée** dans `djomy_transactions`
2. ✅ **Statut passe** de PENDING → PROCESSING → SUCCESS
3. ✅ **Notification reçue** sur le téléphone
4. ✅ **Paiement débité** du compte Mobile Money
5. ✅ **Commande/Wallet** mis à jour dans l'application
6. ✅ **Logs API** sans erreur dans `djomy_api_logs`
7. ✅ **Webhook reçu** (si configuré) dans `djomy_webhook_logs`

---

## 📞 SUPPORT

**En cas de problème persistant :**

1. **Logs Supabase :**
   - Dashboard → Edge Functions → Logs
   - Dashboard → Database → SQL Editor

2. **Logs Djomy :**
   - https://merchant.djomy.africa → Transactions
   - Contact : support@djomy.africa

3. **Documentation :**
   - [DJOMY_CREDENTIALS_GUIDE.md](./DJOMY_CREDENTIALS_GUIDE.md)
   - [DJOMY_POS_PAYMENT_FIX.md](./DJOMY_POS_PAYMENT_FIX.md)

---

## 🎯 CHECKLIST AVANT PRODUCTION

- [ ] Tests en sandbox réussis
- [ ] Credentials production configurés
- [ ] Webhook configuré dans Djomy dashboard
- [ ] Tests avec montants réels (100-1000 GNF)
- [ ] Tests avec Orange Money ✅
- [ ] Tests avec MTN Mobile Money ✅
- [ ] Gestion des erreurs vérifiée
- [ ] Logs de monitoring configurés
- [ ] KYC Djomy validé
- [ ] Limites de transaction configurées

**Une fois cette checklist complète → PRODUCTION READY! 🚀**
