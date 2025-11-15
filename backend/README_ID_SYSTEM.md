# 🔧 SYSTÈME D'ID UNIQUE - 224SOLUTIONS

## 📋 Vue d'ensemble

Système de génération d'IDs uniques au format **LLLDDDD** (3 lettres + 4 chiffres) pour tous les enregistrements du système 224Solutions.

### Format
- **3 lettres majuscules** (A-Z, excluant I, L, O pour éviter confusion avec 1, 0)
- **4 chiffres** (0-9)
- **Exemple**: `ABC1234`, `XYZ9876`, `DEF5432`

## 🗄️ Architecture

### Base de données

#### Supabase
```sql
-- Table de réservation des IDs
CREATE TABLE ids_reserved (
  public_id VARCHAR(8) PRIMARY KEY,
  scope VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Colonnes public_id ajoutées à toutes les tables principales
ALTER TABLE profiles ADD COLUMN public_id VARCHAR(8) UNIQUE;
ALTER TABLE vendors ADD COLUMN public_id VARCHAR(8) UNIQUE;
ALTER TABLE products ADD COLUMN public_id VARCHAR(8) UNIQUE;
-- etc.
```

#### Firestore (optionnel)
```javascript
// Collection: ids_reserved
{
  "public_id": "ABX0456",
  "scope": "drivers",
  "createdAt": Timestamp
}
```

## 🚀 Utilisation

### Backend Node.js

```javascript
const { generateUniqueId } = require('./services/idService');

// Générer un ID pour un utilisateur
const publicId = await generateUniqueId('users', userId);

// Utiliser dans une création
const newUser = {
  name: 'Jean Dupont',
  public_id: publicId,
  // autres champs...
};
```

### Edge Function Supabase

```typescript
const { data } = await supabase.functions.invoke('generate-unique-id', {
  body: { 
    scope: 'products',
    batch: 1 
  }
});

const publicId = data.ids[0]; // "ABC1234"
```

### Frontend React

```typescript
import { usePublicId } from '@/hooks/usePublicId';

function MyComponent() {
  const { generatePublicId, loading } = usePublicId();

  const handleCreate = async () => {
    const id = await generatePublicId('products');
    console.log('ID généré:', id); // "ABC1234"
  };
}
```

## 🎨 Composants UI

### Badge d'affichage

```tsx
import { PublicIdBadge } from '@/components/PublicIdBadge';

<PublicIdBadge 
  publicId="ABC1234"
  variant="secondary"
  size="md"
  copyable={true}
/>
```

### Input avec validation

```tsx
import { PublicIdInput } from '@/components/PublicIdInput';

<PublicIdInput
  value={publicId}
  onChange={setPublicId}
  label="ID Public"
  required={true}
  showValidation={true}
/>
```

## 🔍 Validation

```typescript
import { validatePublicId } from '@/utils/publicIdFormatter';

// Valider un ID
const isValid = validatePublicId('ABC1234'); // true
const isValid = validatePublicId('ABC12');   // false
const isValid = validatePublicId('ILO1234'); // false (lettres interdites)
```

## 📊 Scopes disponibles

- `users` - Utilisateurs
- `vendors` - Vendeurs
- `products` - Produits
- `orders` - Commandes
- `drivers` - Livreurs
- `transactions` - Transactions
- `messages` - Messages
- `conversations` - Conversations

## 🧪 Tests

### Exécuter les tests

```bash
# Backend
cd backend
node test/testIdGeneration.js

# Résultat attendu: génération de 10 IDs uniques
```

### Test manuel

```bash
# Via Edge Function
curl -X POST \
  https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/generate-unique-id \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope": "test", "batch": 5}'
```

## 📈 Monitoring

### Logs Supabase

```sql
-- Voir les IDs générés récemment
SELECT * FROM id_generation_logs 
ORDER BY created_at DESC 
LIMIT 100;

-- Statistiques par scope
SELECT scope, COUNT(*) as total 
FROM ids_reserved 
GROUP BY scope;

-- Détection de collisions (ne devrait jamais arriver)
SELECT public_id, COUNT(*) as duplicates 
FROM ids_reserved 
GROUP BY public_id 
HAVING COUNT(*) > 1;
```

### Alertes

Le système log automatiquement :
- ✅ Génération réussie
- ⚠️ Tentatives multiples (collision)
- ❌ Échec de génération

## 🔐 Sécurité

- IDs générés côté serveur uniquement
- Vérification d'unicité stricte dans Supabase
- Logs complets de toutes les générations
- RLS policies Supabase pour contrôle d'accès

## 🛠️ Maintenance

### Nettoyer les IDs de test

```sql
DELETE FROM ids_reserved 
WHERE scope LIKE 'test%' 
AND created_at < NOW() - INTERVAL '7 days';
```

### Migrer les données existantes

```sql
-- Générer des IDs pour les enregistrements existants sans public_id
UPDATE profiles 
SET public_id = generate_unique_public_id('users')
WHERE public_id IS NULL;
```

## 📞 Support

Pour toute question ou problème :
1. Consulter les logs Supabase
2. Vérifier les statistiques de génération
3. Exécuter les tests de validation

## 🔄 Évolution

Le système supporte jusqu'à **456,976 combinaisons uniques** par scope :
- 23 lettres possibles (sans I, L, O)
- 23 × 23 × 23 × 10 × 10 × 10 × 10 = **456,976 IDs uniques**

Si besoin d'expansion : ajouter un 4ème lettre ou un 5ème chiffre.
