# 🔧 CORRECTION PAIEMENT DJOMY SUR POS - ERREUR 403

## 📋 PROBLÈME IDENTIFIÉ

**Erreur:** 403 Forbidden lors des paiements Mobile Money via Djomy sur le système POS.

**Causes identifiées:**
1. ❌ **Mobile Money temporairement désactivé dans le code POS** (ligne 495-499 de POSSystem.tsx)
2. ⚠️ **Variables d'environnement Djomy non configurées** dans `.env`
3. ⚠️ **Credentials Djomy manquants** (JOMY_CLIENT_ID et JOMY_CLIENT_SECRET)

---

## ✅ SOLUTIONS À APPLIQUER

### 1️⃣ **Réactiver Mobile Money dans le POS**

Le système POS bloque actuellement tous les paiements Mobile Money avant même d'appeler Djomy.

**Fichier:** `src/components/vendor/POSSystem.tsx`  
**Ligne:** 495-499

**Code actuel (PROBLÉMATIQUE):**
```typescript
// Validation Mobile Money
if (paymentMethod === 'mobile_money') {
  toast.error('Mobile Money temporairement indisponible', {
    description: 'Veuillez utiliser Espèces ou Carte bancaire'
  });
  return;
}
```

**À REMPLACER PAR:**
```typescript
// Validation Mobile Money
if (paymentMethod === 'mobile_money') {
  if (!mobileMoneyPhone || mobileMoneyPhone.length !== 9) {
    toast.error('Numéro de téléphone invalide', {
      description: 'Veuillez entrer un numéro de 9 chiffres'
    });
    return;
  }
  if (!mobileMoneyProvider) {
    toast.error('Veuillez sélectionner Orange Money ou MTN MoMo');
    return;
  }
  
  // Appeler Djomy pour le paiement Mobile Money
  await processMobileMoneyPayment();
  return;
}
```

---

### 2️⃣ **Ajouter les variables d'environnement Djomy**

**Fichier:** `.env`

**Ajouter ces lignes:**
```env
# DJOMY PAYMENT API - PRODUCTION
JOMY_CLIENT_ID=<votre_client_id_marchand_djomy>
JOMY_CLIENT_SECRET=<votre_client_secret_djomy>

# DJOMY PAYMENT API - SANDBOX (optionnel pour tests)
JOMY_CLIENT_ID_SANDBOX=<votre_client_id_sandbox>
JOMY_CLIENT_SECRET_SANDBOX=<votre_client_secret_sandbox>
```

**⚠️ IMPORTANT:**
- Le `JOMY_CLIENT_ID` doit ressembler à `djomy-merchant-XXXXX` (fourni par Djomy)
- **NE PAS** utiliser un ID auto-généré de type `djomy-client-1234567890`
- Ces credentials proviennent de votre **espace marchand Djomy**

---

### 3️⃣ **Obtenir les vrais credentials Djomy**

#### Option A: Connexion à l'espace marchand Djomy
1. Connectez-vous à https://merchant.djomy.africa
2. Allez dans **Paramètres** → **API & Intégration**
3. Copiez:
   - **Client ID** (commence par `djomy-merchant-`)
   - **Client Secret** (chaîne alphanumérique longue)

#### Option B: Contacter le support Djomy
```
Email: support@djomy.africa
Objet: Demande d'activation API - 224Solutions
Message:
"Bonjour,

Nous sommes 224Solutions et nous souhaitons intégrer l'API Djomy 
pour les paiements Mobile Money (Orange Money & MTN MoMo).

Pouvez-vous nous fournir nos credentials API de production:
- Client ID (marchand)
- Client Secret

Merci également de whitelister nos serveurs Supabase pour les 
requêtes API depuis notre edge function.

Cordialement,
224Solutions"
```

---

### 4️⃣ **Implémenter la fonction de paiement Mobile Money**

**Fichier:** `src/components/vendor/POSSystem.tsx`

**Ajouter cette fonction après `getOrCreateCustomerId`:**

```typescript
const processMobileMoneyPayment = async () => {
  if (!vendorId || !user?.id) {
    toast.error('Session invalide');
    return;
  }

  try {
    toast.loading('Initialisation du paiement Mobile Money...');

    // Mapper le provider vers le format Djomy
    const paymentMethodCode = mobileMoneyProvider === 'orange' ? 'OM' : 'MOMO';

    // Appeler l'edge function Djomy
    const { data, error } = await supabase.functions.invoke('djomy-payment', {
      body: {
        amount: total,
        payerPhone: `224${mobileMoneyPhone}`, // Format international Guinée
        paymentMethod: paymentMethodCode,
        description: `Paiement POS - ${cart.map(i => i.name).join(', ')}`,
        orderId: `POS-${Date.now()}`,
        useGateway: false, // Paiement direct (sans redirection)
        useSandbox: false, // Production
        countryCode: 'GN',
      }
    });

    if (error) throw error;

    if (data.success) {
      // Créer la commande avec statut pending (en attente confirmation Djomy)
      const customerId = await getOrCreateCustomerId();
      if (!customerId) return;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          vendor_id: vendorId,
          customer_id: customerId,
          total_amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          discount_amount: discountValue,
          payment_status: 'pending', // En attente de confirmation
          status: 'pending',
          payment_method: 'mobile_money',
          shipping_address: { address: 'Point de vente' },
          notes: `Paiement POS Mobile Money - ${paymentMethodCode} - ${mobileMoneyPhone}`,
          source: 'pos'
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Créer les items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.total
      }));

      await supabase.from('order_items').insert(orderItems);

      setShowOrderSummary(false);
      toast.success('Demande de paiement envoyée!', {
        description: 'Le client doit confirmer sur son téléphone'
      });

      // Polling pour vérifier le statut du paiement
      pollPaymentStatus(order.id, data.transactionId);

    } else {
      throw new Error(data.message || 'Erreur initialisation paiement');
    }

  } catch (error: any) {
    console.error('Erreur paiement Mobile Money:', error);
    toast.error('Échec du paiement Mobile Money', {
      description: error.message || 'Vérifiez votre configuration Djomy'
    });
  }
};

// Fonction pour surveiller le statut du paiement
const pollPaymentStatus = async (orderId: string, transactionId: string) => {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes (5s x 60)

  const checkStatus = setInterval(async () => {
    attempts++;

    try {
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .single();

      if (order?.payment_status === 'paid') {
        clearInterval(checkStatus);
        toast.success('✅ Paiement confirmé!');
        setShowReceipt(true);
        await loadVendorProducts();
      } else if (order?.payment_status === 'failed') {
        clearInterval(checkStatus);
        toast.error('❌ Paiement refusé');
      } else if (attempts >= maxAttempts) {
        clearInterval(checkStatus);
        toast.warning('⏱️ Délai dépassé', {
          description: 'Vérifiez manuellement le statut du paiement'
        });
      }
    } catch (error) {
      console.error('Erreur poll status:', error);
    }
  }, 5000); // Vérifier toutes les 5 secondes
};
```

---

### 5️⃣ **Configurer les variables d'environnement Supabase**

**Fichier:** `supabase/config.toml`

**Ajouter dans la section `[env]`:**
```toml
[env]
# ... (autres variables existantes)

# DJOMY API PRODUCTION
JOMY_CLIENT_ID = "env(JOMY_CLIENT_ID)"
JOMY_CLIENT_SECRET = "env(JOMY_CLIENT_SECRET)"

# DJOMY API SANDBOX (optionnel)
JOMY_CLIENT_ID_SANDBOX = "env(JOMY_CLIENT_ID_SANDBOX)"
JOMY_CLIENT_SECRET_SANDBOX = "env(JOMY_CLIENT_SECRET_SANDBOX)"
```

---

## 🔍 DIAGNOSTIC: VÉRIFIER LES CREDENTIALS

L'edge function `djomy-payment/index.ts` contient déjà une validation des credentials (lignes 121-127):

```typescript
// Heuristique: un Client ID "djomy-client-<timestamp>" ressemble à un identifiant de test/généré,
// pas à un identifiant marchand (ex: djomy-merchant-001 dans la doc).
if (/^djomy-client-\d{10,}/.test(cleanClientId)) {
  logStep("Warning: suspicious Djomy clientId format", {
    hint: "Vérifiez que le Client ID provient bien de l'espace marchand Djomy",
    clientIdPrefix: cleanClientId.substring(0, 12) + "...",
  });
}
```

**✅ BON FORMAT:** `djomy-merchant-XXXXX`  
**❌ MAUVAIS FORMAT:** `djomy-client-1234567890`

---

## 📞 DEMANDER WHITELIST À DJOMY

Si vous avez les bons credentials mais recevez toujours une erreur 403, demandez à Djomy de whitelister vos serveurs:

```
Adresses à whitelister:
- Supabase Edge Functions: *.supabase.co
- Votre domaine: 224solutions.com
- IP de vos serveurs (si statiques)
```

---

## 🧪 TESTER APRÈS CORRECTION

### Test 1: Environnement Sandbox
```bash
# Dans .env
JOMY_CLIENT_ID_SANDBOX=<votre_sandbox_id>
JOMY_CLIENT_SECRET_SANDBOX=<votre_sandbox_secret>
```

### Test 2: Paiement de test
1. Ouvrir le POS
2. Ajouter un produit au panier
3. Sélectionner **Mobile Money**
4. Choisir **Orange Money** ou **MTN MoMo**
5. Entrer un numéro de test: `620123456`
6. Cliquer **Valider**
7. Vérifier les logs dans Supabase Dashboard → Edge Functions → djomy-payment

### Test 3: Vérifier les logs
```sql
-- Dans Supabase SQL Editor
SELECT * FROM djomy_payments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM djomy_webhook_logs ORDER BY created_at DESC LIMIT 10;
```

---

## ✅ CHECKLIST FINALE

- [ ] Variables Djomy ajoutées dans `.env`
- [ ] Code Mobile Money réactivé dans `POSSystem.tsx`
- [ ] Fonction `processMobileMoneyPayment` ajoutée
- [ ] Fonction `pollPaymentStatus` ajoutée
- [ ] `supabase/config.toml` mis à jour
- [ ] Credentials vérifiés (format `djomy-merchant-XXX`)
- [ ] Whitelist demandée à Djomy (si nécessaire)
- [ ] Test en sandbox réussi
- [ ] Test en production réussi

---

## 📚 RESSOURCES

- **Documentation Djomy:** https://developers.djomy.africa
- **Support Djomy:** support@djomy.africa
- **Espace marchand:** https://merchant.djomy.africa
- **Edge Function existante:** `supabase/functions/djomy-payment/index.ts`
- **Webhook existant:** `supabase/functions/djomy-webhook/index.ts`

---

**Version:** 1.0.0  
**Date:** 2026-01-01  
**Auteur:** GitHub Copilot - 224Solutions
