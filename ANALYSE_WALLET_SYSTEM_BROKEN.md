# 🔍 ANALYSE PROFONDE: Système Wallet Ne Fonctionne Pas

**Date:** 2026-01-09  
**Statut:** 🔴 CRITIQUE - Système non fonctionnel  
**Fichiers analysés:** 45+

---

## 🚨 PROBLÈMES IDENTIFIÉS

### 1. **CONFLIT DE MIGRATIONS** 🔴 CRITIQUE

**Problème:** Multiple définitions de la table `wallets` dans différentes migrations

**Migrations conflictuelles:**
```sql
📁 supabase/migrations/
├── 20241002000000_fix_auto_user_creation.sql (ligne 256)
├── 20241201100000_wallet_transaction_system.sql (ligne 8) ⚠️ Principale
├── 20250102010000_wallet_system_complete.sql (ligne 21)
├── 20250102050000_complete_syndicate_system.sql (ligne 51)
├── 20250928164246_*.sql (ligne 4)
└── 20251019051550_*.sql (ligne 29)
```

**Impact:** 
- Schéma de table inconsistant
- Colonnes manquantes ou mal nommées
- RLS policies contradictoires
- Transactions échouent silencieusement

**Preuve:**
```typescript
// Dans UniversalWalletTransactions.tsx ligne 166
const { data: existingWallet, error } = await supabase
  .from('wallets')
  .select('id, balance, currency')
  .eq('user_id', effectiveUserId)
  .maybeSingle();
// ❌ Erreur: column "currency" does not exist
```

---

### 2. **DOUBLE SYSTÈME DE TRANSACTIONS** 🔴 CRITIQUE

**Problème:** 2 systèmes parallèles qui ne communiquent pas

#### **Système A: `wallet_transactions`**
```sql
-- Migration: 20241201100000_wallet_transaction_system.sql
CREATE TABLE wallet_transactions (
    transaction_id VARCHAR(50),
    sender_wallet_id UUID,
    receiver_wallet_id UUID,
    amount DECIMAL(15,2),
    net_amount DECIMAL(15,2),
    fee DECIMAL(15,2)
)
```

#### **Système B: `enhanced_transactions`**
```sql
-- Edge Function: wallet-operations/index.ts ligne 615
await supabaseClient.from('enhanced_transactions').insert({
    sender_id: user.id,  -- ⚠️ Différent! user_id au lieu de wallet_id
    receiver_id: user.id,
    amount: amount
})
```

**Conséquence:**
- Transactions enregistrées dans une table mais pas l'autre
- Solde incohérent entre systèmes
- Historique incomplet

---

### 3. **RACE CONDITIONS SUR BALANCE** 🔴 CRITIQUE

**Problème:** Mise à jour du solde sans verrouillage

**Code vulnérable:**
```typescript
// UniversalWalletDashboard.tsx ligne 207-214
const newBalance = wallet.balance + amount; // ⚠️ READ
const { error: updateError } = await supabase
  .from('wallets')
  .update({ balance: newBalance }) // ⚠️ WRITE
  .eq('id', wallet?.id);
```

**Scénario de bug:**
```
T=0s: User a 10000 GNF
T=1s: Transaction A lit balance = 10000
T=2s: Transaction B lit balance = 10000
T=3s: Transaction A écrit balance = 10000 + 5000 = 15000 ✅
T=4s: Transaction B écrit balance = 10000 + 3000 = 13000 ❌ (perte de 5000!)
```

**Solution requise:** Utiliser `SELECT ... FOR UPDATE` ou atomic increment

---

### 4. **INCOHÉRENCE WALLET STATUS** ⚠️ MAJEUR

**Problème:** Champ `status` vs `wallet_status`

**Dans les migrations:**
```sql
-- Migration A: status VARCHAR
status wallet_status DEFAULT 'active'

-- Migration B: wallet_status VARCHAR  
wallet_status VARCHAR(20) DEFAULT 'active'
```

**Dans le code:**
```typescript
// UniversalWalletTransactions.tsx ligne 172
.insert({
    wallet_status: 'active' // ⚠️ Parfois 'status', parfois 'wallet_status'
})
```

**Impact:** Impossible de filtrer les wallets actifs correctement

---

### 5. **EDGE FUNCTION NON DÉPLOYÉE** 🔴 CRITIQUE

**Problème:** Code frontend appelle `wallet-operations` mais Edge Function pas déployée

**Appels dans le code:**
```typescript
// useWallet.ts ligne 190
const { data, error } = await supabase.functions.invoke('wallet-operations', {
    body: { operation: 'deposit', amount }
});
// ❌ Error: Function not found
```

**Vérification:**
```bash
supabase functions list
# Output: (vide) - Aucune function déployée!
```

**Solution:** Déployer via `supabase functions deploy wallet-operations`

---

### 6. **CURRENCY FIELD MANQUANT** ⚠️ MAJEUR

**Problème:** Table `wallets` n'a pas toujours la colonne `currency`

**Migration principale (20241201):**
```sql
currency VARCHAR(3) DEFAULT 'XAF', -- ⚠️ XAF au lieu de GNF!
```

**Code frontend:**
```typescript
// Attend GNF mais reçoit XAF ou NULL
currency: wallet.currency || 'GNF' // Fallback qui masque le bug
```

**Impact:** Conversions de devises incorrectes

---

### 7. **PERMISSIONS RLS CASSÉES** 🔴 CRITIQUE

**Problème:** Politiques RLS trop restrictives ou absentes

**Dans les migrations:**
```sql
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
-- ❌ Mais aucune policy CREATE POLICY définie après!
```

**Résultat:**
```typescript
// Error: new row violates row-level security policy
await supabase.from('wallets').insert({ user_id: '...' })
```

**Policies manquantes:**
- `INSERT` pour création wallet
- `UPDATE` pour dépôt/retrait
- `SELECT` pour lecture solde

---

### 8. **SERVICE DÉPRÉCIÉ ENCORE UTILISÉ** ⚠️ MAJEUR

**Problème:** `walletService.ts` est marqué déprécié mais encore appelé

**Dans le service:**
```typescript
// walletService.ts ligne 166
async transferFunds(...): Promise<boolean> {
    console.error('⚠️ ATTENTION: walletService.transferFunds() est déprécié!');
    throw new Error('Cette méthode est désactivée');
}
```

**Mais appelé dans:**
```typescript
// link-frontend-backend.js ligne 418
const result = await WalletService.processTransaction(transactionData);
// ❌ Throws error!
```

---

### 9. **STRIPE INTEGRATION INCOMPLÈTE** ⚠️ MINEUR

**Problème:** Recharge Stripe enregistre transaction mais ne vérifie pas payment_intent

**Code:**
```typescript
// UniversalWalletTransactions.tsx ligne 1765
metadata: { stripe_payment_intent_id: paymentIntentId }
// ⚠️ Mais pas de vérification si payment_intent est "succeeded"
```

**Risque:** Argent ajouté au wallet sans paiement réel

---

### 10. **AGENT/BUREAU WALLETS SÉPARÉS** ⚠️ DESIGN

**Problème:** 3 tables de wallets différentes

```sql
wallets            -- Utilisateurs normaux
agent_wallets      -- Agents
bureau_wallets     -- Bureaux syndicaux
```

**Impact:**
- Code dupliqué (3x les mêmes fonctions)
- Transferts inter-types impossibles
- Maintenance complexe

---

## 🔧 CORRECTIFS REQUIS (Par priorité)

### ✅ **Priorité 1: Migrations**

1. **Supprimer migrations dupliquées:**
```sql
-- Garder UNIQUEMENT: 20241201100000_wallet_transaction_system.sql
-- Supprimer toutes les autres définitions de wallets
```

2. **Schema unifié:**
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'GNF', -- ✅ GNF pour Guinée
    wallet_status VARCHAR(20) DEFAULT 'active', -- ✅ Standardiser
    is_blocked BOOLEAN DEFAULT false,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. **RLS Policies:**
```sql
-- Lecture
CREATE POLICY "Users can view own wallet"
ON wallets FOR SELECT
USING (auth.uid() = user_id);

-- Écriture (via Edge Function seulement)
CREATE POLICY "Service role can manage wallets"
ON wallets FOR ALL
USING (auth.role() = 'service_role');
```

---

### ✅ **Priorité 2: Edge Function**

**Déployer wallet-operations:**
```bash
cd supabase/functions/wallet-operations
supabase functions deploy wallet-operations --no-verify-jwt
```

**Ajouter secrets:**
```bash
supabase secrets set TRANSACTION_SECRET_KEY="$(openssl rand -base64 32)"
```

---

### ✅ **Priorité 3: Verrouillage Optimiste**

**Remplacer les updates directs par atomic operations:**

```sql
-- Créer fonction SQL atomique
CREATE OR REPLACE FUNCTION update_wallet_balance_atomic(
    p_wallet_id UUID,
    p_amount DECIMAL,
    p_transaction_id VARCHAR
)
RETURNS TABLE(new_balance DECIMAL, success BOOLEAN) AS $$
DECLARE
    v_new_balance DECIMAL;
BEGIN
    -- Lock row
    SELECT balance INTO v_new_balance
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;
    
    -- Update atomically
    v_new_balance := v_new_balance + p_amount;
    
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Solde insuffisant';
    END IF;
    
    UPDATE wallets
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_wallet_id;
    
    RETURN QUERY SELECT v_new_balance, true;
END;
$$ LANGUAGE plpgsql;
```

**Utiliser dans le code:**
```typescript
const { data, error } = await supabase.rpc('update_wallet_balance_atomic', {
    p_wallet_id: walletId,
    p_amount: amount,
    p_transaction_id: txId
});
```

---

### ✅ **Priorité 4: Unifier Transactions**

**Migrer vers une seule table:**
```sql
DROP TABLE IF EXISTS enhanced_transactions; -- Supprimer doublon

ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS receiver_user_id UUID REFERENCES profiles(id);

-- Créer index
CREATE INDEX idx_wallet_tx_sender ON wallet_transactions(sender_user_id);
CREATE INDEX idx_wallet_tx_receiver ON wallet_transactions(receiver_user_id);
```

---

### ✅ **Priorité 5: Code Frontend**

**Remplacer calls directs par Edge Function:**

```typescript
// ❌ AVANT (UniversalWalletDashboard.tsx)
const { error } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', walletId);

// ✅ APRÈS
const { data, error } = await supabase.functions.invoke('wallet-operations', {
    body: {
        operation: 'deposit',
        amount: amount,
        idempotency_key: `DEP-${Date.now()}-${userId}`
    }
});
```

---

## 📊 TESTS DE VALIDATION

### Test 1: Création Wallet
```typescript
const { data: wallet } = await supabase
    .from('wallets')
    .insert({ user_id: userId })
    .select()
    .single();

console.assert(wallet.balance === 0);
console.assert(wallet.currency === 'GNF');
console.assert(wallet.wallet_status === 'active');
```

### Test 2: Dépôt Concurrent
```typescript
// Lancer 10 dépôts simultanés de 1000 GNF
const promises = Array(10).fill(null).map(() =>
    supabase.functions.invoke('wallet-operations', {
        body: { operation: 'deposit', amount: 1000 }
    })
);

await Promise.all(promises);

// Vérifier solde final
const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();

console.assert(wallet.balance === 10000); // ✅ Doit être 10000, pas moins!
```

### Test 3: Transfert P2P
```typescript
await supabase.functions.invoke('wallet-operations', {
    body: {
        operation: 'transfer',
        recipient_id: 'CLI-12345',
        amount: 5000,
        description: 'Test transfert'
    }
});

// Vérifier les 2 wallets
const sender = await getWallet(senderId);
const receiver = await getWallet(receiverId);

console.assert(sender.balance === initialSender - 5000);
console.assert(receiver.balance === initialReceiver + 5000);
```

---

## 🚀 PLAN D'ACTION

### **Phase 1: Urgence (2h)** 🔴
- [ ] Créer migration consolidée `20260109_fix_wallet_system.sql`
- [ ] Supprimer migrations dupliquées (backup d'abord)
- [ ] Déployer Edge Function `wallet-operations`
- [ ] Activer RLS policies correctes

### **Phase 2: Stabilisation (4h)** 🟡
- [ ] Remplacer tous les appels directs par Edge Function
- [ ] Implémenter atomic balance updates
- [ ] Unifier table transactions
- [ ] Tester concurrence (10 transactions simultanées)

### **Phase 3: Validation (2h)** 🟢
- [ ] Tests unitaires (Jest/Vitest)
- [ ] Tests E2E (Playwright)
- [ ] Test de charge (100 users/s)
- [ ] Monitoring temps réel (Sentry)

---

## 📝 COMMANDES D'URGENCE

```bash
# 1. Backup database
supabase db dump > backup-$(date +%s).sql

# 2. Reset wallet tables
supabase db reset

# 3. Appliquer migration fixée
supabase db push

# 4. Déployer Edge Function
cd supabase/functions/wallet-operations
supabase functions deploy wallet-operations

# 5. Tester en local
supabase functions serve wallet-operations

# 6. Vérifier en prod
curl -X POST https://your-project.supabase.co/functions/v1/wallet-operations \
  -H "Authorization: Bearer $ANON_KEY" \
  -d '{"operation":"deposit","amount":1000}'
```

---

## 🎯 RÉSULTAT ATTENDU

Après correctifs:
- ✅ 1 seule table `wallets` avec schema cohérent
- ✅ Toutes opérations via Edge Function sécurisée
- ✅ Atomic balance updates (0 race conditions)
- ✅ RLS policies actives et testées
- ✅ Historique complet dans `wallet_transactions`
- ✅ Tests automatisés (>95% coverage)

---

**Status:** 🔴 EN ATTENTE DE CORRECTIONS  
**Urgence:** CRITIQUE - Système financier non fonctionnel  
**Temps estimé:** 8h (avec tests)
