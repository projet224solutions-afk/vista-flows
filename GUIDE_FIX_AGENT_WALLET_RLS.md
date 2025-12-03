# 🔧 Guide: Résolution du problème RLS pour agent_wallets

## ⚠️ Problème Identifié

**Erreur**: `new row violates row-level security policy for table "agent_wallets"`

Les politiques RLS (Row Level Security) empêchent les agents de créer leur propre wallet.

## ✅ Solution Implémentée

Création d'une fonction PostgreSQL avec `SECURITY DEFINER` qui contourne les restrictions RLS.

## 📝 Étapes pour Déployer la Solution

### Option 1: Via le Dashboard Supabase (Recommandé)

1. **Connectez-vous à Supabase**: https://supabase.com/dashboard
2. **Sélectionnez votre projet**: `224Solutions`
3. **Allez dans SQL Editor** (icône dans le menu gauche)
4. **Cliquez sur "New query"**
5. **Copiez-collez ce SQL**:

```sql
-- Fonction pour créer un wallet agent (contourne RLS)
CREATE OR REPLACE FUNCTION create_agent_wallet(p_agent_id UUID)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  balance NUMERIC,
  currency TEXT,
  wallet_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier si le wallet existe déjà
  IF EXISTS (SELECT 1 FROM agent_wallets WHERE agent_wallets.agent_id = p_agent_id) THEN
    -- Retourner le wallet existant
    RETURN QUERY
    SELECT 
      agent_wallets.id,
      agent_wallets.agent_id,
      agent_wallets.balance,
      agent_wallets.currency,
      agent_wallets.wallet_status,
      agent_wallets.created_at,
      agent_wallets.updated_at
    FROM agent_wallets
    WHERE agent_wallets.agent_id = p_agent_id;
  ELSE
    -- Créer un nouveau wallet
    RETURN QUERY
    INSERT INTO agent_wallets (agent_id, balance, currency, wallet_status)
    VALUES (p_agent_id, 0, 'GNF', 'active')
    RETURNING 
      agent_wallets.id,
      agent_wallets.agent_id,
      agent_wallets.balance,
      agent_wallets.currency,
      agent_wallets.wallet_status,
      agent_wallets.created_at,
      agent_wallets.updated_at;
  END IF;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION create_agent_wallet(UUID) TO authenticated;

COMMENT ON FUNCTION create_agent_wallet IS 'Crée ou retourne un wallet agent existant - Contourne RLS';
```

6. **Cliquez sur "Run"** (ou Ctrl+Enter)
7. **Vérifiez le message de succès**: "Success. No rows returned"

### Option 2: Via CLI Supabase

```bash
# Si vous avez Supabase CLI installé
supabase db push
```

## 🧪 Tester la Solution

1. **Rechargez votre dashboard agent**
2. **Allez dans l'onglet Wallet**
3. **Cliquez sur "Lancer le diagnostic"** dans l'outil de diagnostic
4. **Vérifiez que le test "Création du wallet (RPC)" est vert** ✅

## 🔍 Vérification Manuelle

Pour vérifier que la fonction existe:

```sql
-- Dans SQL Editor
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'create_agent_wallet';
```

Résultat attendu:
```
routine_name          | routine_type
create_agent_wallet   | FUNCTION
```

## 📊 Comment ça Marche

### Avant (❌ Ne fonctionnait pas)
```typescript
await supabase
  .from('agent_wallets')
  .insert({ agent_id, balance: 0 })
  // ❌ Bloqué par RLS
```

### Après (✅ Fonctionne)
```typescript
await supabase
  .rpc('create_agent_wallet', { p_agent_id: agentId })
  // ✅ Contourne RLS avec SECURITY DEFINER
```

## 🔐 Sécurité

- La fonction vérifie d'abord si le wallet existe
- Si oui, retourne le wallet existant (pas de doublon)
- Si non, crée un nouveau wallet avec balance = 0
- Seuls les utilisateurs authentifiés peuvent l'utiliser
- La fonction s'exécute avec les privilèges du propriétaire de la DB

## 🎯 Avantages

1. **Pas besoin de modifier les politiques RLS** existantes
2. **Sécurisé**: Seule cette fonction spécifique contourne RLS
3. **Réutilisable**: Peut être appelée depuis n'importe où
4. **Idempotente**: Plusieurs appels ne créent pas de doublons

## 🚀 Après le Déploiement

Une fois la fonction créée, les agents pourront:
- ✅ Créer automatiquement leur wallet au premier accès
- ✅ Voir leur solde
- ✅ Effectuer des dépôts
- ✅ **Retirer leurs commissions**
- ✅ Consulter l'historique des transactions

## ❓ Dépannage

### La fonction existe mais ne fonctionne pas?

```sql
-- Vérifier les permissions
SELECT has_function_privilege('authenticated', 'create_agent_wallet(uuid)', 'EXECUTE');
```

Doit retourner `true`.

### Réinitialiser la fonction

```sql
DROP FUNCTION IF EXISTS create_agent_wallet(UUID);
-- Puis recréez-la
```

## 📞 Support

Si le problème persiste après avoir créé la fonction:
1. Partagez le message d'erreur exact
2. Vérifiez les logs dans SQL Editor
3. Testez avec l'outil de diagnostic intégré
