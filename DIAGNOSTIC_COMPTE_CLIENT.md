# 🔍 DIAGNOSTIC - INTERFACE COMPTE CLIENT
**Date**: 2 janvier 2026  
**Problème**: Rien ne fonctionne - recharge impossible, achats impossibles

## 📋 Problèmes Identifiés

### 1. ❌ Recharge Wallet (UniversalWalletTransactions.tsx)
**Symptôme**: Le bouton "Dépôt" ne fonctionne pas ou échoue

**Causes**:
- ✅ La fonction `handleDeposit()` existe (lignes 434-537)
- ✅ Insertion manuelle dans `wallet_transactions` 
- ✅ Mise à jour manuelle du solde dans `wallets`
- ⚠️ **Mais pas d'intégration Djomy pour Orange Money / MTN MoMo**
- ⚠️ **Pas de méthode de paiement sélectionnable (carte, mobile money)**
- ⚠️ **Processus simplifié qui ne passe pas par l'edge function**

**Impact**: Les clients ne peuvent PAS recharger leur wallet via Orange Money ou MTN MoMo, seulement via insertion directe (dev only)

---

### 2. ❌ Retrait Wallet
**Symptôme**: Le bouton "Retrait" fonctionne partiellement

**Causes**:
- ✅ La fonction `handleWithdraw()` existe (lignes 539-608)
- ✅ Vérification du solde
- ✅ Création transaction + mise à jour solde
- ⚠️ Mais pas de méthode de retrait réel (agent, banque...)

**Impact**: Retrait fonctionnel mais incomplet (pas de cash-out réel)

---

### 3. ❌ Achats de Produits (ProductPaymentModal.tsx)
**Symptôme**: L'achat échoue lors du processus de paiement

**Causes identifiées**:
1. **Fonction RPC `create_online_order`**
   - Ligne 347: Appel à `supabase.rpc('create_online_order', {...})`
   - ⚠️ Cette fonction existe dans les migrations
   - ✅ Paramètres corrects passés
   - ⚠️ **Possible problème**: Le `customerId` passé est peut-être inexistant

2. **Vérification du customer_id**
   - Dans ClientDashboard.tsx (lignes 97-114):
   ```tsx
   const { data } = await supabase
     .from('customers')
     .select('id')
     .eq('user_id', user.id)
     .single();
   
   if (data) {
     setCustomerId(data.id);
   }
   ```
   - ⚠️ **Si aucun `customer` n'existe**, `customerId` reste `null`
   - ⚠️ Le modal s'affiche quand même mais l'achat échoue

3. **Solde wallet insuffisant**
   - Ligne 311: Vérification `walletBalance < grandTotal`
   - ✅ Logique correcte
   - ⚠️ Mais si wallet = 0 et pas de recharge possible → Bloqué

4. **Escrow Service**
   - Ligne 371: `UniversalEscrowService.createEscrow(...)`
   - ⚠️ Service appelé mais peut échouer si wallet vide

---

## 🔧 Solutions à Appliquer

### Solution 1: Intégrer Djomy pour Recharge Wallet
**Fichier**: `src/components/wallet/UniversalWalletTransactions.tsx`

**Modifications**:
1. Ajouter des onglets de méthode de paiement dans le Dialog "Dépôt"
   - Orange Money
   - MTN MoMo
   - Carte bancaire
   
2. Appeler l'edge function `djomy-payment` comme dans Payment.tsx (ligne 791-900)

3. Gérer le callback de paiement réussi pour mettre à jour le wallet

**Code à ajouter** (inspiré de Payment.tsx):
```tsx
const handleDjomyDeposit = async (method: 'OM' | 'MOMO') => {
  const amount = parseFloat(depositAmount);
  
  const { data, error } = await supabase.functions.invoke('djomy-payment', {
    body: {
      amount: amount,
      payerPhone: `224${mobileMoneyPhone}`,
      paymentMethod: method,
      description: `Recharge wallet`,
      orderId: `WLT-${Date.now()}`,
      useGateway: false,
      useSandbox: true,
      countryCode: 'GN',
    }
  });

  if (data?.success) {
    // Polling pour vérifier le statut
    pollPaymentStatus(data.transactionId);
  }
};
```

---

### Solution 2: Auto-création du Customer
**Fichier**: `src/pages/ClientDashboard.tsx`

**Modification** (lignes 97-114):
```tsx
const loadCustomerId = async () => {
  if (!user?.id) return;
  
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle(); // ← Utiliser maybeSingle au lieu de single
  
  if (data) {
    setCustomerId(data.id);
  } else {
    // ← AJOUTER: Créer automatiquement le customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({ user_id: user.id })
      .select('id')
      .single();
    
    if (newCustomer) {
      setCustomerId(newCustomer.id);
    } else {
      console.error('Failed to create customer:', error);
    }
  }
};
```

---

### Solution 3: Validation avant ouverture du Modal Paiement
**Fichier**: `src/pages/ClientDashboard.tsx`

**Modification** (ligne 119):
```tsx
const handleCheckout = async () => {
  if (!user?.id) {
    toast.error(t('client.connectionRequired'));
    return;
  }
  
  if (cartItems.length === 0) {
    toast.error(t('client.emptyCart'));
    return;
  }
  
  // ← AJOUTER: Vérifier que le customer existe
  if (!customerId) {
    toast.error('Compte client non initialisé. Veuillez rafraîchir la page.');
    await loadCustomerId(); // Tenter de le créer
    return;
  }
  
  setShowPaymentModal(true);
};
```

---

### Solution 4: Afficher un Message si Wallet Vide
**Fichier**: `src/components/ecommerce/ProductPaymentModal.tsx`

**Modification** (avant le bouton de paiement):
```tsx
{paymentMethod === 'wallet' && walletBalance === 0 && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      Votre wallet est vide. Rechargez-le d'abord via l'onglet Wallet.
    </AlertDescription>
  </Alert>
)}
```

---

## 🎯 Plan d'Action Priorisé

### Priorité 1: URGENT
1. ✅ **Auto-création du customer** (ClientDashboard.tsx)
   - Empêche l'erreur "customer non trouvé"
   
2. ✅ **Validation pré-checkout** (ClientDashboard.tsx)
   - Empêche l'ouverture du modal si customer inexistant

### Priorité 2: CRITIQUE
3. ✅ **Intégration Djomy dans Wallet** (UniversalWalletTransactions.tsx)
   - Permet la recharge via Orange Money / MTN MoMo
   
4. ✅ **Message wallet vide** (ProductPaymentModal.tsx)
   - Guide l'utilisateur vers la recharge

### Priorité 3: AMÉLIORATIONS
5. **Bouton "Recharger" direct** dans ProductPaymentModal
   - Navigation vers /wallet ou modal intégré
   
6. **Historique des tentatives d'achat**
   - Logger les échecs pour debug

---

## 📊 Tests à Effectuer Après Correction

### Test 1: Recharge Wallet
- [ ] Se connecter comme client
- [ ] Aller sur l'onglet Wallet
- [ ] Cliquer "Dépôt"
- [ ] Choisir Orange Money
- [ ] Entrer numéro et montant
- [ ] Confirmer le paiement
- [ ] Vérifier que le solde est mis à jour

### Test 2: Achat Produit
- [ ] Ajouter un produit au panier
- [ ] Cliquer "Commander"
- [ ] Vérifier que le modal de paiement s'ouvre
- [ ] Sélectionner "Wallet"
- [ ] Confirmer le paiement
- [ ] Vérifier la commande dans l'onglet "Mes commandes"

### Test 3: Scénarios d'Erreur
- [ ] Tenter d'acheter avec wallet vide → Message clair
- [ ] Tenter d'acheter sans customer_id → Auto-création
- [ ] Tenter recharge avec numéro invalide → Message d'erreur

---

## 🔗 Fichiers Concernés

### À Modifier:
1. **src/components/wallet/UniversalWalletTransactions.tsx** (Recharge Djomy)
2. **src/pages/ClientDashboard.tsx** (Auto-création customer + validation)
3. **src/components/ecommerce/ProductPaymentModal.tsx** (Message wallet vide)

### Migrations Supabase:
- ✅ `create_online_order` existe déjà
- ✅ Trigger `create_customer_on_signup` existe
- ⚠️ Mais pas forcément actif pour tous les users existants

---

## 💡 Recommandations Finales

1. **Activer le trigger automatique** de création customer pour TOUS les nouveaux utilisateurs
2. **Migrer tous les users existants** vers la table customers (script SQL)
3. **Ajouter des logs détaillés** dans ProductPaymentModal pour debug
4. **Créer un composant "WalletRechargeModal"** réutilisable avec Djomy
5. **Ajouter un bouton "Besoin d'aide ?"** dans le modal de paiement

---

## 🚀 Estimation

**Temps de correction**: 1-2 heures  
**Priorité**: 🔴 CRITIQUE - Bloque l'e-commerce  
**Impact**: 100% des clients affectés
