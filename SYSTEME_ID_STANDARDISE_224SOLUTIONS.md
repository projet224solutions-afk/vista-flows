# 🆔 SYSTÈME D'IDENTIFIANTS STANDARDISÉS 224SOLUTIONS

## Vue d'ensemble

Système universel d'identifiants séquentiels pour toute la plateforme 224SOLUTIONS.

**Format universel:** `AAA0001`
- 3 lettres majuscules (préfixe du type)
- 4+ chiffres séquentiels (incrémentation automatique)

---

## ✅ Fonctionnalités implémentées

### 1. **Base de données**
- ✅ Table `id_counters` pour gérer les compteurs par préfixe
- ✅ Table `id_migration_map` pour mapper anciens IDs → nouveaux IDs
- ✅ Fonction SQL `generate_sequential_id(prefix)` pour génération atomique
- ✅ Fonction SQL `preview_next_id(prefix)` pour aperçu sans incrémenter
- ✅ Fonction SQL `validate_standard_id(id)` pour validation format
- ✅ Fonction SQL `migrate_existing_ids()` pour réorganiser les IDs existants

### 2. **Edge Function**
- ✅ `generate-unique-id` mis à jour pour le système séquentiel
- ✅ Support des préfixes personnalisés
- ✅ Génération batch (jusqu'à 10 IDs)
- ✅ Mapping automatique scope → préfixe

### 3. **Frontend**
- ✅ Hook `useStandardId()` pour génération et validation
- ✅ Composant `StandardIdBadge` pour affichage avec style
- ✅ Page admin `/admin/migrate-ids` pour migration des données

---

## 📋 Préfixes standards

| Préfixe | Description | Scope |
|---------|-------------|-------|
| `USR` | Utilisateurs | users, user |
| `VND` | Vendeurs | vendors, vendor |
| `PDG` | PDG | pdg |
| `AGT` | Agents | agents, agent |
| `SAG` | Sous-agents | sub_agents, sub_agent |
| `SYD` | Syndicats | syndicats, syndicat |
| `DRV` | Livreurs | drivers, driver |
| `CLI` | Clients | clients, client, customers, customer |
| `PRD` | Produits | products, product |
| `ORD` | Commandes | orders, order |
| `TXN` | Transactions | transactions, transaction |
| `WLT` | Wallets | wallets, wallet |
| `MSG` | Messages | messages, message |
| `CNV` | Conversations | conversations, conversation |
| `DLV` | Livraisons | deliveries, delivery |
| `GEN` | Général | general |

---

## 🚀 Utilisation

### **Dans le code TypeScript/React**

```typescript
import { useStandardId } from '@/hooks/useStandardId';

function MonComposant() {
  const { generateStandardId, validateStandardId, extractPrefix } = useStandardId();

  // Générer un ID utilisateur
  const handleCreateUser = async () => {
    const userId = await generateStandardId('users'); // Génère: USR0001
    console.log('User ID:', userId);
  };

  // Valider un ID
  const isValid = validateStandardId('USR0042'); // true
  
  // Extraire le préfixe
  const prefix = extractPrefix('VND0123'); // 'VND'
}
```

### **Affichage avec Badge**

```typescript
import { StandardIdBadge } from '@/components/StandardIdBadge';

function AffichageId({ userId }) {
  return (
    <StandardIdBadge 
      standardId={userId} 
      size="md" 
      copyable={true}
      showIcon={true}
    />
  );
}
```

### **Génération batch**

```typescript
const { generateBatchStandardIds } = useStandardId();

// Générer 5 IDs produits
const productIds = await generateBatchStandardIds('products', 5);
// ['PRD0001', 'PRD0002', 'PRD0003', 'PRD0004', 'PRD0005']
```

### **Appel direct SQL**

```sql
-- Générer un ID utilisateur
SELECT generate_sequential_id('USR');
-- Résultat: 'USR0001'

-- Prévisualiser le prochain ID sans l'incrémenter
SELECT preview_next_id('VND');
-- Résultat: 'VND0042'

-- Valider un ID
SELECT validate_standard_id('AGT0123');
-- Résultat: true
```

---

## 📊 Migration des données existantes

### **Étapes de migration**

1. **Accéder à la page de migration**
   ```
   https://votre-app.com/admin/migrate-ids
   ```

2. **Vérifier les compteurs actuels**
   - Affiche l'état des compteurs par préfixe

3. **Lancer la migration**
   - Cliquer sur "Démarrer la migration"
   - La fonction `migrate_existing_ids()` va:
     - Scanner toutes les tables avec des IDs existants
     - Générer de nouveaux IDs standardisés
     - Créer un mapping ancien_id → nouveau_id
     - Afficher les résultats de la migration

4. **Résultat**
   - Les anciens IDs restent dans `id_migration_map`
   - Les nouveaux IDs sont générés séquentiellement
   - Possibilité de retrouver les anciens IDs via la table de mapping

### **Tables migrées automatiquement**
- `user_ids` (custom_id)
- `profiles` (public_id, custom_id)
- `vendors` (public_id)
- `products` (public_id)
- `wallets` (public_id)
- `orders` (public_id)
- `enhanced_transactions` (public_id, custom_id)
- Et plus encore...

---

## 🔧 Évolutivité automatique

Le système gère automatiquement l'évolutivité:

### **Passage automatique de 4 à 5+ chiffres**
```
USR0001 → USR0002 → ... → USR9999 → USR10000 → USR10001
```

Le nombre de chiffres s'adapte automatiquement selon le compteur.

### **Capacité par préfixe**
- 4 chiffres: 10,000 IDs (0001-9999)
- 5 chiffres: 100,000 IDs (10000-99999)
- 6 chiffres: 1,000,000 IDs
- **Infini** grâce à l'ajout automatique de chiffres

---

## 🔒 Sécurité et unicité

### **Garanties**
- ✅ Unicité absolue par préfixe
- ✅ Incrémentation atomique (pas de collision)
- ✅ Validation stricte du format
- ✅ Traçabilité complète
- ✅ Mapping des anciens IDs

### **Validation du format**
```typescript
// Format attendu: 3 lettres majuscules + 4+ chiffres
/^[A-Z]{3}\d{4,}$/

// Valides
'USR0001' ✅
'VND0042' ✅
'AGT10000' ✅

// Invalides
'usr0001' ❌ (minuscules)
'US0001' ❌ (2 lettres)
'USR001' ❌ (3 chiffres)
'123USR0001' ❌ (mauvais format)
```

---

## 📈 Statistiques et monitoring

### **Consulter les compteurs**

```sql
-- Voir tous les compteurs
SELECT * FROM id_counters ORDER BY prefix;

-- Voir un préfixe spécifique
SELECT * FROM id_counters WHERE prefix = 'USR';
```

### **Via le hook**

```typescript
const { getPrefixStats } = useStandardId();

const stats = await getPrefixStats('USR');
console.log(stats);
// {
//   prefix: 'USR',
//   current_value: 42,
//   description: 'Utilisateurs',
//   created_at: '...',
//   updated_at: '...'
// }
```

---

## 🆕 Créer un nouveau préfixe

### **Via SQL**

```sql
INSERT INTO id_counters (prefix, current_value, description)
VALUES ('NEW', 0, 'Nouvelle catégorie')
ON CONFLICT (prefix) DO NOTHING;
```

### **Utilisation automatique**

La fonction `generate_sequential_id()` crée automatiquement un préfixe s'il n'existe pas:

```sql
SELECT generate_sequential_id('XYZ'); -- Crée 'XYZ' automatiquement
```

---

## 🎯 Exemples d'usage par interface

### **Création d'utilisateur**
```typescript
const userId = await generateStandardId('users');
// Génère: USR0001, USR0002, etc.

await supabase.from('profiles').insert({
  id: uuidv4(),
  public_id: userId,
  ...userData
});
```

### **Création de produit**
```typescript
const productId = await generateStandardId('products');
// Génère: PRD0001, PRD0002, etc.
```

### **Création de transaction**
```typescript
const txnId = await generateStandardId('transactions');
// Génère: TXN0001, TXN0002, etc.
```

---

## 🚨 Important

1. **Ne jamais modifier manuellement** les compteurs dans `id_counters`
2. **Toujours utiliser** `generate_sequential_id()` pour générer des IDs
3. **Conserver** la table `id_migration_map` pour référence historique
4. **Valider** tous les IDs avant insertion avec `validate_standard_id()`

---

## 📞 Support

Pour toute question sur le système d'IDs standardisés:
- Consulter ce document
- Voir les exemples de code dans `src/hooks/useStandardId.ts`
- Tester avec la page `/admin/migrate-ids`

---

**🎉 Système opérationnel et prêt pour production!**
