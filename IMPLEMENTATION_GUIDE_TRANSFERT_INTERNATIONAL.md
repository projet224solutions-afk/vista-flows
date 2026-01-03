# 🌍 SYSTÈME TRANSFERT INTERNATIONAL - GUIDE IMPLÉMENTATION

**Date**: 2026-01-03  
**Version**: 2.0.0  
**Statut**: ✅ Migrations créées, prêt pour déploiement

---

## 📦 FICHIERS CRÉÉS

### 1. **Migrations SQL**

#### `20260103000001_add_country_detection_agents.sql`
- Ajoute colonnes géolocalisation aux profiles
- Fonction `detect_user_country(p_user_id)` - Détecte pays/devise/langue
- Fonction `update_user_geolocation()` - Enregistre géo depuis frontend
- Mapping complet 50+ pays → devise (EUR, USD, XOF, GNF, etc.)
- Index performance sur `detected_country`

#### `20260103000002_add_multi_currency_agent_wallets.sql`
- Ajoute `currency_type` à `agent_wallets`
- Contrainte unique `(agent_id, currency_type)`
- Fonction `create_agent_multi_currency_wallets()` - Crée 4 wallets (GNF/EUR/USD/XOF)
- Fonction `get_agent_wallet_by_currency()` - Récupère wallet par devise
- Fonction `get_agent_target_wallet_currency()` - Router transfert vers bon wallet
- Trigger auto-création wallets multi-devises pour nouveaux agents
- Migration automatique agents existants → 4 wallets

#### `20260103000003_add_adaptive_fees_by_corridor.sql`
- Insert 50+ corridors de paiement (GN→FR: 2.5%, GN→GN: 0.5%, etc.)
- Fonction `get_transfer_fee_by_corridor()` - Frais spécifiques par corridor
- Fonction `calculate_transfer_fee_enhanced()` - Calcul frais amélioré
- Vue `v_payment_corridor_analytics` - Analytics corridors
- RLS policies pour `transfer_fees`

### 2. **Hook Frontend**

#### `src/hooks/useGeoRegistration.ts`
- Auto-détection géo au login
- 3 méthodes: GPS (Google API) → GeoIP → Default (GN)
- Enregistrement automatique dans `profiles`
- Cache 7 jours (pas de re-détection quotidienne)
- Mapping 50+ pays → devise + langue

### 3. **Edge Function Modifiée**

#### `supabase/functions/wallet-transfer/index.ts`
- Détection pays expéditeur/destinataire via `detect_user_country()`
- Enregistrement `sender_country` / `receiver_country` dans `wallet_transfers`
- Logs pays dans console pour debugging

---

## 🚀 DÉPLOIEMENT

### Étape 1: Appliquer les migrations

```powershell
# Migration 1: Détection pays
supabase migration up --file 20260103000001_add_country_detection_agents.sql

# Migration 2: Wallets multi-devises
supabase migration up --file 20260103000002_add_multi_currency_agent_wallets.sql

# Migration 3: Frais adaptatifs
supabase migration up --file 20260103000003_add_adaptive_fees_by_corridor.sql
```

### Étape 2: Redéployer Edge Function

```powershell
# Redéployer wallet-transfer avec détection pays
supabase functions deploy wallet-transfer
```

### Étape 3: Intégrer hook frontend

Ajouter dans `App.tsx` ou `AuthProvider.tsx`:

```typescript
import { useGeoRegistration } from '@/hooks/useGeoRegistration';

function App() {
  const { detecting, detected, result } = useGeoRegistration();
  
  useEffect(() => {
    if (detected && result) {
      console.log('📍 User location:', result);
      // Optionnel: afficher notification
      // toast.success(`Location detected: ${result.country}`);
    }
  }, [detected, result]);
  
  // ... rest of app
}
```

---

## ✅ FONCTIONNALITÉS IMPLÉMENTÉES

### 1. **Détection Pays Automatique**

**Frontend (au login)**:
```typescript
const { detected, result } = useGeoRegistration();
// → { country: 'FR', currency: 'EUR', language: 'fr', method: 'geoip' }
```

**Backend (dans transfert)**:
```sql
SELECT * FROM detect_user_country('user-id-xxx');
-- → { country: 'GN', currency: 'GNF', language: 'fr', method: 'default' }
```

**Enregistrement DB**:
```sql
profiles:
  detected_country: 'FR'
  detected_currency: 'EUR'
  detected_language: 'fr'
  geo_detection_method: 'geoip'
  last_geo_update: '2026-01-03 15:30:00'
```

### 2. **Wallets Multi-Devises Agents**

**Structure**:
```
Agent AGT001 (France):
  - Wallet GNF: 0 GNF
  - Wallet EUR: 0 EUR
  - Wallet USD: 0 USD
  - Wallet XOF: 0 XOF

Agent AGT002 (Guinée):
  - Wallet GNF: 500 000 GNF
  - Wallet EUR: 0 EUR
  - Wallet USD: 0 USD
  - Wallet XOF: 0 XOF
```

**Récupération**:
```sql
-- Wallet EUR de l'agent
SELECT * FROM get_agent_wallet_by_currency('agent-id-xxx', 'EUR');
-- → { wallet_id: 'xxx', balance: 0, currency: 'EUR' }
```

**Auto-routing**:
```sql
-- Déterminer devise cible selon pays destinataire
SELECT get_agent_target_wallet_currency('agent-id', 'GN', 'FR');
-- → 'EUR' (agent France reçoit en EUR)
```

### 3. **Frais Adaptatifs par Corridor**

**Exemples**:
```sql
-- Transfert local Guinea → Guinea
GN → GN (GNF → GNF): 0.5% fees

-- Transfert CEDEAO
GN → CI (GNF → XOF): 1.0% fees
GN → SN (GNF → XOF): 1.0% fees

-- Transfert Europe
GN → FR (GNF → EUR): 2.5% fees
GN → DE (GNF → EUR): 2.5% fees

-- Transfert intercontinental
GN → US (GNF → USD): 3.0% fees
GN → CN (GNF → CNY): 3.5% fees
```

**Calcul**:
```sql
SELECT * FROM calculate_transfer_fee_enhanced(
  100000,     -- montant
  'GNF',      -- devise source
  'EUR',      -- devise cible
  'GN',       -- pays source
  'FR'        -- pays cible
);
-- → { fee_percentage: 2.5, fee_amount: 2500, amount_after_fee: 97500, corridor: 'GN → FR (GNF→EUR)' }
```

### 4. **Tracking Pays dans Transferts**

**Avant**:
```sql
wallet_transfers:
  sender_country: NULL ❌
  receiver_country: NULL ❌
```

**Après**:
```sql
wallet_transfers:
  sender_country: 'GN' ✅
  receiver_country: 'FR' ✅
  currency_sent: 'GNF'
  currency_received: 'EUR'
  fee_percentage: 2.5
  corridor: 'GN → FR'
```

### 5. **Analytics Corridors**

**Vue disponible**:
```sql
SELECT * FROM v_payment_corridor_analytics;
-- Résultat:
-- corridor        | transfer_count | total_sent | total_fees | total_margin
-- GN → FR         | 245            | 25M GNF    | 625K GNF   | 125K GNF
-- GN → CI         | 156            | 18M GNF    | 180K GNF   | 90K GNF
-- GN → SN         | 98             | 12M GNF    | 120K GNF   | 60K GNF
```

---

## 🧪 TESTS RECOMMANDÉS

### Test 1: Détection Pays

```typescript
// Frontend
import { useGeoRegistration } from '@/hooks/useGeoRegistration';

function TestComponent() {
  const { detecting, detected, result } = useGeoRegistration();
  
  if (detecting) return <div>Detecting location...</div>;
  if (detected) return <div>Country: {result?.country}</div>;
}
```

**Résultat attendu**:
- GPS activé → `{ country: 'FR', method: 'google-api', accuracy: 'high' }`
- GPS refusé → `{ country: 'FR', method: 'geoip', accuracy: 'medium' }`
- Erreur → `{ country: 'GN', method: 'default', accuracy: 'low' }`

### Test 2: Wallets Multi-Devises

```sql
-- Vérifier que tous les agents ont 4 wallets
SELECT 
  am.agent_code,
  COUNT(aw.id) AS wallet_count,
  STRING_AGG(aw.currency_type, ', ') AS currencies
FROM agents_management am
LEFT JOIN agent_wallets aw ON aw.agent_id = am.id
GROUP BY am.agent_code;

-- Résultat attendu:
-- agent_code | wallet_count | currencies
-- AGT001     | 4            | GNF, EUR, USD, XOF
-- AGT002     | 4            | GNF, EUR, USD, XOF
```

### Test 3: Frais par Corridor

```sql
-- Test frais local
SELECT * FROM get_transfer_fee_by_corridor('GN', 'GN', 'GNF', 'GNF', 100000);
-- → fee_percentage: 0.5, total_fee: 500

-- Test frais Europe
SELECT * FROM get_transfer_fee_by_corridor('GN', 'FR', 'GNF', 'EUR', 100000);
-- → fee_percentage: 2.5, total_fee: 2500

-- Test frais CEDEAO
SELECT * FROM get_transfer_fee_by_corridor('GN', 'CI', 'GNF', 'XOF', 100000);
-- → fee_percentage: 1.0, total_fee: 1000
```

### Test 4: Transfert International Complet

```typescript
// 1. Agent Guinée crée transfert vers Agent France
const transfert = await supabase.functions.invoke('wallet-transfer', {
  body: {
    sender_id: 'agent-gn-user-id',
    receiver_id: 'agent-fr-user-id',
    amount: 100000, // GNF
    description: 'Commission mois janvier'
  }
});

// 2. Vérifier enregistrement
const { data } = await supabase
  .from('wallet_transfers')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

console.log(data);
// Attendu:
// sender_country: 'GN' ✅
// receiver_country: 'FR' ✅
// currency_sent: 'GNF'
// currency_received: 'EUR'
// fee_percentage: 2.5
// amount_sent: 100000
// amount_received: ~9.33 (selon taux du jour)
```

---

## 📊 RÉSUMÉ DES AMÉLIORATIONS

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| **Détection pays** | ❌ Aucune | ✅ Auto (GPS/GeoIP) |
| **Tracking pays transferts** | ❌ NULL | ✅ Enregistré |
| **Wallets agent** | 🟡 1 wallet GNF | ✅ 4 wallets (GNF/EUR/USD/XOF) |
| **Frais transfert** | 🟡 1.5% fixe | ✅ Adaptatif (0.5%-3.5%) |
| **Analytics corridors** | ❌ Aucune | ✅ Vue SQL + Dashboard possible |
| **Compliance** | ❌ Aucune | 🟡 Structure prête (KYC à ajouter) |

---

## 🔜 PROCHAINES ÉTAPES (Phase 2)

### 1. **Système KYC/AML**
```sql
-- Migration future
CREATE TABLE agent_kyc_status (
  agent_id UUID PRIMARY KEY,
  kyc_level VARCHAR(20) DEFAULT 'basic',
  document_verified BOOLEAN DEFAULT false,
  max_transfer_daily NUMERIC DEFAULT 1000000,
  blocked_countries TEXT[] DEFAULT ARRAY[]::TEXT[]
);
```

### 2. **Limites par Pays**
```sql
-- Ajouter à transfer_fees
ALTER TABLE transfer_fees 
ADD COLUMN max_amount_per_transfer NUMERIC,
ADD COLUMN max_amount_daily NUMERIC,
ADD COLUMN max_amount_monthly NUMERIC;
```

### 3. **Interface Admin Corridors**
- Dashboard analytics corridors
- Gestion frais par corridor
- Alertes volumes suspects
- Rapports réglementaires

### 4. **Optimisations**
- Cache pays détectés (Redis)
- Batch processing transferts
- Notifications temps réel
- Webhooks compliance

---

## 📞 SUPPORT

**Questions?** Vérifier:
1. Logs Supabase: Dashboard → Edge Functions → wallet-transfer
2. Console browser: `useGeoRegistration` logs
3. DB: `SELECT * FROM profiles WHERE id = 'user-id'`
4. Analytics: `SELECT * FROM v_payment_corridor_analytics`

**Erreurs communes**:
- `detect_user_country not found` → Migration 1 pas appliquée
- `currency_type column missing` → Migration 2 pas appliquée
- `transfer_fees empty` → Migration 3 pas appliquée
- `GPS permission denied` → Normal, fallback GeoIP actif

---

**Dernière mise à jour**: 2026-01-03 16:00 UTC  
**Prêt pour production**: ✅ OUI (après tests)
