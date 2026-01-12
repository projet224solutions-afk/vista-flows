# 🔄 SYNCHRONISATION SERVICE TYPES AVEC INSCRIPTION

## ✅ PROBLÈME RÉSOLU

**Avant:** Les services dans `service_types` (base de données) ne correspondaient pas exactement à ceux proposés sur la page d'inscription.

**Maintenant:** Synchronisation parfaite entre la page d'inscription et la base de données.

---

## 📋 SERVICES DISPONIBLES (16 TYPES)

### Page d'inscription (MerchantOnboarding.tsx)
| Code | Nom | Catégorie | Commission |
|------|-----|-----------|------------|
| `ecommerce` | Boutique / E-commerce | Commerce | 8% |
| `restaurant` | Restaurant / Alimentation | Alimentation | 10% |
| `beaute` | Beauté & Bien-être | Beauté | 12% |
| `reparation` | Réparation / Mécanique | Réparation | 15% |
| `location` | Location Immobilière | Immobilier | 5% |
| `menage` | Ménage & Entretien | Services | 12% |
| `livraison` | Livraison / Coursier | Transport | 10% |
| `media` | Photographe / Vidéaste | Média | 15% |
| `education` | Éducation / Formation | Éducation | 10% |
| `sante` | Santé & Bien-être | Santé | 12% |
| `voyage` | Voyage / Tourisme | Tourisme | 10% |
| `freelance` | Services Professionnels | Professionnel | 12% |
| `construction` | Construction / BTP | Construction | 15% |
| `agriculture` | Agriculture | Agriculture | 8% |
| `informatique` | Informatique / Tech | Technologie | 12% |
| `vtc` | VTC / Transport | Transport | 15% |

---

## 🗄️ MIGRATION CRÉÉE

**Fichier:** `supabase/migrations/20260111_sync_service_types_inscription.sql`

### Ce que fait la migration :

1. **Crée/Met à jour tous les services**
   - Fonction `upsert_service_type()` pour éviter les doublons
   - Insertion des 16 types de services
   - Mise à jour des noms, descriptions, catégories

2. **Associe les icônes**
   - Chaque service a son icône correspondante
   - Mapping identique à MerchantOnboarding.tsx

3. **Désactive les anciens services**
   - Services non listés marqués `is_active = false`
   - Pas de suppression (conservation historique)

4. **Génère un rapport**
   - Compte des services actifs/inactifs
   - Liste détaillée des services synchronisés

---

## 🔧 FICHIERS MODIFIÉS

### 1. AddServiceModal.tsx
```typescript
// Avant: 14 services
const SERVICE_ICONS: Record<string, React.ElementType> = {
  ecommerce: Store,
  restaurant: Utensils,
  beaute: Scissors,
  vtc: Car,
  sante: Heart,
  education: BookOpen,
  media: Camera,
  livraion: Truck,
  location: Building2,
  sport: Dumbbell,
  informatique: Laptop,
  agriculture: Leaf,
  construction: Hammer,
  menage: Sparkles,
  default: Store
};

// Maintenant: 16 services (synchronisé avec inscription)
const SERVICE_ICONS: Record<string, React.ElementType> = {
  ecommerce: Store,
  restaurant: Utensils,
  beaute: Scissors,
  reparation: Car,        // ✅ AJOUTÉ
  location: Building2,
  menage: Sparkles,
  livraison: Truck,
  media: Camera,
  education: BookOpen,
  sante: Heart,
  voyage: Plus,           // ✅ AJOUTÉ
  freelance: Plus,        // ✅ AJOUTÉ
  construction: Hammer,
  agriculture: Leaf,
  informatique: Laptop,
  vtc: Car,
  default: Store
};
```

---

## 🚀 APPLICATION DE LA MIGRATION

### Via Supabase Studio (Recommandé)

1. Ouvrir Supabase Dashboard
2. Aller dans **SQL Editor**
3. Créer une nouvelle query
4. Copier-coller le contenu de `20260111_sync_service_types_inscription.sql`
5. Exécuter (bouton Run)
6. Vérifier le rapport dans les logs

### Via psql (Terminal)

```powershell
# Se connecter à la base de données
psql -U postgres -d vista_flows

# Exécuter la migration
\i supabase/migrations/20260111_sync_service_types_inscription.sql

# Vérifier les services
SELECT code, name, category, is_active 
FROM service_types 
ORDER BY category, name;
```

### Via Supabase CLI

```powershell
# Si vous utilisez Supabase CLI
supabase db push

# Ou
supabase migration up
```

---

## ✅ VÉRIFICATION APRÈS MIGRATION

### 1. Vérifier tous les services actifs

```sql
SELECT code, name, category, commission_rate, icon
FROM service_types
WHERE is_active = true
ORDER BY category, name;
```

**Résultat attendu:** 16 services actifs

### 2. Vérifier un service spécifique

```sql
-- Exemple pour e-commerce
SELECT * FROM service_types WHERE code = 'ecommerce';

-- Exemple pour restaurant
SELECT * FROM service_types WHERE code = 'restaurant';
```

### 3. Compter par catégorie

```sql
SELECT category, COUNT(*) as count
FROM service_types
WHERE is_active = true
GROUP BY category
ORDER BY count DESC;
```

**Résultat attendu:**
```
Commerce       : 1
Alimentation   : 1
Beauté         : 1
Réparation     : 1
Immobilier     : 1
Services       : 1
Transport      : 2 (livraison + vtc)
Média          : 1
Éducation      : 1
Santé          : 1
Tourisme       : 1
Professionnel  : 1
Construction   : 1
Agriculture    : 1
Technologie    : 1
```

---

## 🧪 TESTS À EFFECTUER

### Test 1: Inscription vendeur
```
1. Aller sur /auth
2. Cliquer "S'inscrire"
3. Sélectionner rôle "Vendeur"
4. Vérifier que TOUS les 16 services sont affichés
5. Sélectionner "Restaurant"
6. Finaliser l'inscription
7. Vérifier que professional_services est créé avec bon service_type_id
```

### Test 2: Création de service dans le dashboard
```
1. Se connecter comme vendeur
2. Aller dans "Module Métier"
3. Cliquer "Nouveau service"
4. Vérifier que TOUS les 16 services sont affichés
5. Sélectionner "Beauté & Bien-être"
6. Remplir le formulaire
7. Créer le service
8. Vérifier que le service apparaît dans le ServiceSelector
```

### Test 3: Icônes correctes
```
1. Ouvrir AddServiceModal
2. Vérifier que chaque service a son icône:
   - ecommerce → Store
   - restaurant → Utensils
   - beaute → Scissors
   - reparation → Car
   - location → Building2
   - etc.
```

---

## 📊 RAPPORT DE SYNCHRONISATION

Après exécution de la migration, vous verrez :

```
════════════════════════════════════════════════════
📊 RAPPORT DE SYNCHRONISATION - Service Types
════════════════════════════════════════════════════
Services actifs: 16
Services inactifs: X
Total services: X
════════════════════════════════════════════════════
Services actifs:
  ✓ Boutique / E-commerce (ecommerce)
  ✓ Restaurant / Alimentation (restaurant)
  ✓ Beauté & Bien-être (beaute)
  ✓ Réparation / Mécanique (reparation)
  ✓ Location Immobilière (location)
  ✓ Ménage & Entretien (menage)
  ✓ Livraison / Coursier (livraison)
  ✓ Photographe / Vidéaste (media)
  ✓ Éducation / Formation (education)
  ✓ Santé & Bien-être (sante)
  ✓ Voyage / Tourisme (voyage)
  ✓ Services Professionnels (freelance)
  ✓ Construction / BTP (construction)
  ✓ Agriculture (agriculture)
  ✓ Informatique / Tech (informatique)
  ✓ VTC / Transport (vtc)
════════════════════════════════════════════════════
✅ Synchronisation terminée avec succès!
```

---

## 🔄 CORRESPONDANCE EXACTE

### MerchantOnboarding.tsx → service_types
```typescript
// Dans MerchantOnboarding.tsx
const SERVICE_TYPES = [
  { value: "ecommerce", code: "ecommerce", label: "Boutique / E-commerce" },
  { value: "restaurant", code: "restaurant", label: "Restaurant / Alimentation" },
  // ... 16 services au total
];

// Dans service_types (après migration)
SELECT code, name FROM service_types WHERE is_active = true;
/*
ecommerce    | Boutique / E-commerce
restaurant   | Restaurant / Alimentation
beaute       | Beauté & Bien-être
reparation   | Réparation / Mécanique
location     | Location Immobilière
menage       | Ménage & Entretien
livraison    | Livraison / Coursier
media        | Photographe / Vidéaste
education    | Éducation / Formation
sante        | Santé & Bien-être
voyage       | Voyage / Tourisme
freelance    | Services Professionnels
construction | Construction / BTP
agriculture  | Agriculture
informatique | Informatique / Tech
vtc          | VTC / Transport
*/
```

✅ **100% de correspondance !**

---

## 🎯 AVANTAGES DE CETTE SYNCHRONISATION

### 1. Cohérence
- Même liste partout (inscription, création service, dashboard)
- Pas de service "manquant" ou "en double"

### 2. Évolutivité
- Ajouter un nouveau service → 2 endroits à modifier:
  1. `MerchantOnboarding.tsx` (frontend)
  2. Cette migration (backend)

### 3. Fiabilité
- Fonction `upsert_service_type()` évite les erreurs
- Migration idempotente (peut être réexécutée)
- Pas de suppression de données (is_active = false)

### 4. Maintenance
- Code centralisé et documenté
- Facile à auditer
- Historique conservé

---

## 🚨 NOTES IMPORTANTES

### Services conservés pour compatibilité
- `vtc` : Ancien service VTC maintenu
- `general` : Service par défaut conservé
- Anciens services marqués `is_active = false` (pas supprimés)

### Taux de commission par défaut
Les taux sont définis selon la complexité du service :
- **5%** : Immobilier (transactions élevées)
- **8%** : E-commerce, Agriculture (volume élevé)
- **10%** : Restaurant, Livraison, Éducation, Tourisme (standard)
- **12%** : Beauté, Ménage, Santé, Freelance, Informatique (services personnalisés)
- **15%** : Réparation, Média, Construction, VTC (expertise technique)

Ces taux peuvent être ajustés dans la migration selon votre stratégie.

---

## 🔧 MAINTENANCE FUTURE

### Ajouter un nouveau service

1. **Dans MerchantOnboarding.tsx**
```typescript
{ value: "nouveau", code: "nouveau", label: "Nouveau Service", icon: Icon }
```

2. **Créer une migration**
```sql
SELECT upsert_service_type(
  'nouveau',
  'Nouveau Service',
  'Description du service',
  'Catégorie',
  10.0
);

UPDATE service_types SET icon = 'Icon' WHERE code = 'nouveau';
```

3. **Dans AddServiceModal.tsx**
```typescript
const SERVICE_ICONS: Record<string, React.ElementType> = {
  // ... existing
  nouveau: Icon,
};
```

### Modifier un service existant

```sql
UPDATE service_types
SET name = 'Nouveau nom',
    description = 'Nouvelle description',
    commission_rate = 15.0
WHERE code = 'code_du_service';
```

---

## ✅ CHECKLIST DE DÉPLOIEMENT

Avant de déployer en production :

- [ ] Migration SQL testée en développement
- [ ] Tous les 16 services affichés dans l'inscription
- [ ] Tous les services affichés dans AddServiceModal
- [ ] Icônes correctes pour chaque service
- [ ] Test d'inscription complet réussi
- [ ] Test de création de service réussi
- [ ] ServiceSelector fonctionne avec tous les services
- [ ] Aucune erreur dans la console
- [ ] Documentation à jour

---

**Date:** 11 janvier 2026  
**Version:** 1.0  
**Statut:** ✅ Prêt pour application immédiate

---

**PROCHAINE ÉTAPE:** Appliquer la migration `20260111_sync_service_types_inscription.sql` ! 🚀
