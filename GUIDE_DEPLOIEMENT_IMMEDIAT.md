# Guide de Déploiement Immédiat - 224Solutions

**Date:** 29 novembre 2025  
**Statut:** ✅ Corrections appliquées en local, en attente de déploiement

---

## 📋 Résumé des corrections effectuées

### ✅ Frontend - Composant Wallet
**Fichier:** `src/components/wallet/UniversalWalletTransactions.tsx`

**Problème résolu:**
- Bug "Mon Wallet... Chargement..." causé par race condition du state React
- La fonction `checkIfAgent()` utilisait les states `isAgent` et `agentInfo` avant qu'ils ne soient mis à jour

**Solution appliquée:**
```typescript
// Ligne 92-133 - Passage de valeurs locales au lieu du state
let isAgentUser = false;
let agentInfoData = null;

if (agentData) {
  isAgentUser = true;
  agentInfoData = { id: agentData.id, agent_code: agentData.agent_code, name: agentData.name };
  setIsAgent(true);
  setAgentInfo(agentInfoData);
}

// Appel avec les valeurs locales (pas le state)
await loadWalletData(isAgentUser, agentInfoData);
```

**Validation:** ✅ Aucune erreur TypeScript détectée

---

### ✅ Backend - Route Wallet Initialization
**Fichier:** `backend/src/routes/wallet.routes.js`

**Ajout:**
```javascript
router.post('/initialize', authMiddleware, async (req, res) => {
  const { user_id } = req.body;
  
  // Vérifier que le userId fourni correspond à l'utilisateur authentifié ou que c'est un service role
  if (req.user.id !== user_id && req.user.role !== 'service_role') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase.rpc('rpc_create_user_wallet', {
      p_user_id: user_id
    });

    if (error) throw error;

    const wallet = data?.[0];
    const isNewWallet = wallet && wallet.balance === 0;

    res.json({
      wallet: wallet,
      created: isNewWallet
    });
  } catch (error) {
    console.error('Error initializing wallet:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### ✅ Base de données - Migration RLS
**Fichier:** `supabase/migrations/20251129_fix_wallet_creation.sql`

**Contenu:**
```sql
-- Fonction RPC sécurisée pour initialiser les wallets
CREATE OR REPLACE FUNCTION public.rpc_create_user_wallet(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  balance NUMERIC,
  currency TEXT,
  wallet_status TEXT,
  created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Sécurité: autoriser seulement service_role ou l'utilisateur ciblé
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' 
     AND auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized to initialize wallet for another user';
  END IF;

  -- Vérifier que l'utilisateur existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % does not exist', p_user_id;
  END IF;

  -- Si le wallet existe déjà, le retourner
  IF EXISTS (SELECT 1 FROM wallets WHERE user_id = p_user_id) THEN
    RETURN QUERY
    SELECT * FROM wallets WHERE user_id = p_user_id;
    RETURN;
  END IF;

  -- Créer le wallet et le retourner
  RETURN QUERY
  INSERT INTO wallets (user_id, balance, currency, wallet_status)
  VALUES (p_user_id, 0, 'GNF', 'active')
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_create_user_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_user_wallet(UUID) TO service_role;
```

**Statut:** ⏳ En attente d'application sur l'instance Supabase

---

### ✅ Edge Functions - Abonnement Vendeur
**Fichiers corrigés:**
1. `supabase/functions/subscription-webhook/index.ts`
2. `supabase/functions/renew-subscription/index.ts`

**Problème résolu:**
- Mauvais noms de paramètres RPC (`p_amount_paid` → `p_price_paid`)
- Fonction inexistante (`handle_pdg_revenue` → `record_pdg_revenue`)

**Corrections appliquées:**

**subscription-webhook (ligne 36-58):**
```typescript
// Enregistrer le paiement de l'abonnement
const { error: paymentError } = await supabaseAdmin.rpc('record_subscription_payment', {
  p_subscription_id: data.subscription_id,
  p_price_paid: data.amount / 100,        // ✅ Corrigé: p_price_paid
  p_payment_transaction_id: data.id,      // ✅ Corrigé: p_payment_transaction_id
  p_billing_cycle: 'monthly',             // ✅ Ajouté
  p_payment_method: data.payment_method_types[0],
  p_next_billing_date: new Date(data.current_period_end * 1000).toISOString()
});

// Enregistrer le revenu PDG (15% de commission)
const pdgRevenue = (data.amount / 100) * 0.15;
const { error: revenueError } = await supabaseAdmin.rpc('record_pdg_revenue', { // ✅ Corrigé: record_pdg_revenue
  p_source_type: 'subscription',          // ✅ Corrigé: p_source_type
  p_source_id: data.subscription_id,
  p_amount: pdgRevenue,                   // ✅ Corrigé: p_amount
  p_percentage: 15,                       // ✅ Ajouté
  p_description: `Commission abonnement vendeur`
});
```

**renew-subscription (ligne 141-148):**
```typescript
// Enregistrer le revenu PDG
const pdgRevenue = subscriptionPrice * 0.15;
const { error: revenueError } = await supabaseAdmin.rpc('record_pdg_revenue', { // ✅ Corrigé
  p_source_type: 'subscription',          // ✅ Corrigé
  p_source_id: activeSubscription.id,
  p_amount: pdgRevenue,                   // ✅ Corrigé
  p_percentage: 15,                       // ✅ Ajouté
  p_description: `Renouvellement abonnement vendeur`
});
```

**Statut:** ⏳ En attente de déploiement sur Supabase

---

## 🚀 Étapes de déploiement à effectuer

### 1. Appliquer la migration SQL

**Option A - Via console Supabase (recommandé):**
1. Ouvrir https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new
2. Copier le contenu de `supabase/migrations/20251129_fix_wallet_creation.sql`
3. Coller dans l'éditeur SQL
4. Cliquer sur "Run"
5. Vérifier qu'aucune erreur n'apparaît

**Option B - Via CLI (nécessite service role key):**
```powershell
# Définir la clé service role
$env:SUPABASE_SERVICE_ROLE_KEY = 'votre_clé_service_role_valide'

# Appliquer les migrations
supabase db push --project-ref uakkxaibujzxdiqzpnpr
```

---

### 2. Déployer les Edge Functions

**Option A - Via console Supabase (recommandé):**

**Pour subscription-webhook:**
1. Ouvrir https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions
2. Cliquer sur "subscription-webhook" ou "Create new function"
3. Copier le contenu de `supabase/functions/subscription-webhook/index.ts`
4. Coller dans l'éditeur
5. Cliquer sur "Deploy"

**Pour renew-subscription:**
1. Répéter les mêmes étapes avec `supabase/functions/renew-subscription/index.ts`

**Option B - Via CLI:**
```powershell
# Définir la clé service role
$env:SUPABASE_SERVICE_ROLE_KEY = 'votre_clé_service_role_valide'

# Déployer subscription-webhook
supabase functions deploy subscription-webhook --project-ref uakkxaibujzxdiqzpnpr

# Déployer renew-subscription
supabase functions deploy renew-subscription --project-ref uakkxaibujzxdiqzpnpr
```

**Option C - Via script automatisé:**
```powershell
# Installer les dépendances si nécessaire
npm install dotenv

# Définir la clé service role
$env:SUPABASE_SERVICE_ROLE_KEY = 'votre_clé_service_role_valide'

# Exécuter le script de déploiement
node deploy-subscription-functions.mjs
```

---

### 3. Tester le système

**Test du wallet:**
```powershell
# Exécuter le test E2E du wallet
node scripts/e2e_test_wallet_communication.js
```

**Vérifications manuelles:**
1. Se connecter à l'application (https://votre-app-224solutions.netlify.app)
2. Naviguer vers "Mon Wallet"
3. Vérifier que le solde s'affiche correctement
4. Tester un dépôt de 10 000 GNF
5. Tester un transfert vers un autre utilisateur (ID format USR0001)
6. Vérifier l'historique des transactions

**Test abonnement vendeur:**
1. Se connecter en tant que vendeur
2. Naviguer vers "Abonnement"
3. Tenter de souscrire à un abonnement
4. Vérifier que le webhook est appelé
5. Vérifier que le revenu PDG est enregistré

---

## ⚠️ Points d'attention

### Sécurité
- La clé service role exposée dans la conversation doit être **IMMÉDIATEMENT RÉVOQUÉE**
- Générer une nouvelle clé via: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/api
- Ne JAMAIS commit de clés réelles dans le dépôt Git

### Variables d'environnement
Les placeholders dans `.env` doivent être remplacés par les vraies valeurs:
- `__SUPABASE_SERVICE_ROLE_KEY__` → Nouvelle clé générée
- `__SUPABASE_ANON_KEY__` → Clé publique anon
- Les autres variables marquées `__PLACEHOLDER__`

### Fichier .env.example
Un fichier `.env.example` a été créé avec tous les placeholders pour référence future.

---

## 📊 Statut du déploiement

| Composant | Statut | Action requise |
|-----------|--------|----------------|
| Frontend (UniversalWalletTransactions) | ✅ Corrigé | Déployé sur Netlify via Git push |
| Backend (route wallet/initialize) | ✅ Créé | Déployé sur Netlify via Git push |
| Migration SQL (RPC wallet) | ⏳ En attente | Appliquer via console Supabase |
| Edge Function (subscription-webhook) | ⏳ En attente | Déployer via console/CLI |
| Edge Function (renew-subscription) | ⏳ En attente | Déployer via console/CLI |

---

## 🎯 Prochaines étapes recommandées

1. **Rotation immédiate des secrets** (priorité critique)
2. **Appliquer la migration SQL** (5 minutes)
3. **Déployer les Edge Functions** (10 minutes)
4. **Tester le flux wallet complet** (15 minutes)
5. **Tester l'abonnement vendeur** (15 minutes)
6. **Monitorer les logs Supabase** pour détecter d'éventuelles erreurs

---

## 📞 Support

En cas de problème lors du déploiement:
- Vérifier les logs Supabase: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs
- Consulter la documentation Supabase CLI: https://supabase.com/docs/guides/cli
- Vérifier les erreurs dans la console du navigateur (F12)

---

**Fin du guide - Tous les fichiers sont prêts pour le déploiement** ✅
