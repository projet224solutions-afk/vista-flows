# 🔧 Correction Format ID Agent

## Problème Identifié
L'interface agent affichait un ID au format aléatoire: **SAG-MIAOINPJ** au lieu du format séquentiel requis: **AGT00001**

## Cause Racine
Plusieurs anciennes fonctions SQL généraient des codes aléatoires:
- `generate_vendor_agent_code()` → Format: AGT-XXXX ou SAG-XXXXXXXX
- `generate_unique_agent_code()` → Format aléatoire
- Triggers multiples créant des conflits

## Solutions Appliquées

### 1. Migration SQL (`fix_agent_code_format.sql`)
```sql
-- Suppression de toutes les anciennes fonctions
DROP FUNCTION IF EXISTS auto_generate_agent_code() CASCADE;
DROP FUNCTION IF EXISTS generate_unique_agent_code() CASCADE;
DROP FUNCTION IF EXISTS generate_vendor_agent_code() CASCADE;

-- Nouvelle fonction séquentielle
CREATE FUNCTION generate_sequential_agent_code()
→ Format: AGT00001, AGT00002, AGT00003...
→ Extrait le dernier numéro et incrémente
→ Vérifie l'unicité
```

### 2. Frontend (`AgentCreation.tsx`)
```typescript
// Génération automatique au chargement
useEffect(() => {
  const newCode = await generateUniqueId('agent');
  setFormData(prev => ({ ...prev, agentCode: newCode }));
}, []);

// Validation avant insertion
if (!finalAgentCode || !/^AGT\d{5}$/.test(finalAgentCode)) {
  finalAgentCode = await generateUniqueId('agent');
}
```

### 3. Système `autoIdGenerator.ts`
✅ Déjà correct - utilise le bon format
- Récupère le dernier code AGT
- Extrait le numéro
- Incrémente
- Formate avec padding (5 chiffres)

## Format Final

| Avant | Après |
|-------|-------|
| SAG-MIAOINPJ | AGT00001 |
| AGT-1234 | AGT00002 |
| Format aléatoire | AGT00003 |

## Fichiers Modifiés

1. **`supabase/migrations/fix_agent_code_format.sql`** (NOUVEAU)
   - Supprime anciens triggers
   - Crée fonction séquentielle
   - Trigger auto-génération
   - Fonction de migration pour codes existants

2. **`src/pages/AgentCreation.tsx`**
   - Import de `generateUniqueId`
   - useEffect pour génération auto
   - Validation regex avant insertion
   - Régénération si format invalide

3. **`src/lib/autoIdGenerator.ts`** (AUCUN CHANGEMENT)
   - Déjà conforme au format requis

## Migration des Données Existantes

Pour migrer les agents avec anciens codes:

```sql
-- Exécuter dans Supabase SQL Editor
SELECT * FROM migrate_existing_agent_codes();
```

Cela convertira automatiquement:
- SAG-MIAOINPJ → AGT00001
- AGT-1234 → AGT00002
- Etc.

## Tests de Validation

### ✅ À Vérifier
1. Créer un nouvel agent → Doit avoir AGT00001 (ou suivant)
2. Affichage dans AgentDashboard → Badge avec AGT00001
3. Copie du code → Doit copier AGT00001
4. Anciens agents → Migrer avec la fonction SQL

### Format Regex
```regex
^AGT\d{5}$
```
- AGT → Préfixe fixe (3 caractères)
- \d{5} → Exactement 5 chiffres
- Exemples valides: AGT00001, AGT12345, AGT99999

## Prochaines Étapes

1. **Déployer la migration SQL** dans Supabase
2. **Tester** la création d'un nouvel agent
3. **Migrer** les codes existants si nécessaire
4. **Vérifier** l'affichage dans les dashboards

## Impact

- ✅ Format cohérent et professionnel
- ✅ IDs séquentiels faciles à mémoriser
- ✅ Pas de conflit avec le système existant
- ✅ Migration progressive possible
- ✅ Rétrocompatibilité via fonction de migration

## Notes Importantes

⚠️ **Après déploiement de la migration:**
- Les nouveaux agents auront AGT00001, AGT00002...
- Les anciens agents gardent leur code jusqu'à migration manuelle
- Utiliser `migrate_existing_agent_codes()` pour convertir

🔒 **Sécurité:**
- Fonction SECURITY DEFINER pour bypass RLS
- Vérification d'unicité intégrée
- Gestion des erreurs avec fallback
