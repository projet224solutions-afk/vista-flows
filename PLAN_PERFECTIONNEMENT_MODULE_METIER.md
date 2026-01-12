# PLAN D'IMPLÉMENTATION - PERFECTIONNEMENT MODULE MÉTIER

## 🎯 Objectif
Perfectionner le système de modules métiers en ajoutant les fonctionnalités critiques et en corrigeant les limitations identifiées.

---

## 📋 PRIORITÉS (par ordre d'importance)

### 🔴 PRIORITÉ 1 - CRITIQUE (À faire immédiatement)

#### 1.1 Synchronisation vendor ↔ professional_services
**Problème:** Incohérence potentielle entre `vendors.service_type` et `professional_services.service_type_id`

**Impact:** 
- Données désynchronisées entre les deux tables
- Bugs potentiels dans les requêtes
- Confusion pour les utilisateurs

**Solution:**
```sql
-- Fichier: supabase/migrations/YYYYMMDD_sync_vendor_professional_services.sql

-- 1. Trigger de synchronisation automatique
CREATE OR REPLACE FUNCTION sync_vendor_service_type()
RETURNS TRIGGER AS $$
DECLARE
  service_code VARCHAR;
BEGIN
  -- Récupérer le code du service_type
  SELECT code INTO service_code
  FROM service_types
  WHERE id = NEW.service_type_id;
  
  -- Mettre à jour le vendor
  UPDATE vendors
  SET service_type = service_code
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Créer le trigger
CREATE TRIGGER sync_vendor_service_after_insert
AFTER INSERT ON professional_services
FOR EACH ROW
EXECUTE FUNCTION sync_vendor_service_type();

CREATE TRIGGER sync_vendor_service_after_update
AFTER UPDATE OF service_type_id ON professional_services
FOR EACH ROW
EXECUTE FUNCTION sync_vendor_service_type();

-- 3. Synchroniser les données existantes
UPDATE vendors v
SET service_type = (
  SELECT st.code
  FROM professional_services ps
  JOIN service_types st ON st.id = ps.service_type_id
  WHERE ps.user_id = v.user_id
  AND ps.status = 'active'
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM professional_services ps
  WHERE ps.user_id = v.user_id
  AND ps.status = 'active'
);
```

**Estimation:** 30 minutes  
**Test:** Créer un service → Vérifier que vendor.service_type est mis à jour

---

#### 1.2 Validation renforcée dans AddServiceModal
**Problème:** Validation minimale, risque de données invalides

**Impact:**
- Noms d'entreprise inappropriés
- Descriptions trop longues
- Caractères spéciaux problématiques

**Solution:**
```typescript
// Fichier: src/components/vendor/business-module/AddServiceModal.tsx

// Ajouter après les imports
import { z } from 'zod';

// Schéma de validation
const serviceFormSchema = z.object({
  businessName: z
    .string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .regex(
      /^[a-zA-Z0-9\sÀ-ÿ\-'&.]+$/,
      'Le nom contient des caractères non autorisés'
    )
    .trim(),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'L\'adresse ne peut pas dépasser 200 caractères')
    .optional()
    .or(z.literal(''))
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

// Dans handleCreate, ajouter validation
const handleCreate = async () => {
  if (!user?.id || !selectedType) {
    toast.error('Session expirée, veuillez vous reconnecter');
    return;
  }

  // ✅ NOUVELLE VALIDATION
  try {
    const formData: ServiceFormData = {
      businessName,
      description,
      address
    };
    
    const validatedData = serviceFormSchema.parse(formData);
    
    setCreating(true);
    
    // Créer le service avec les données validées
    const { data, error } = await supabase
      .from('professional_services')
      .insert({
        user_id: user.id,
        service_type_id: selectedType.id,
        business_name: validatedData.businessName,
        description: validatedData.description || null,
        address: validatedData.address || null,
        status: 'active',
        verification_status: 'unverified',
        rating: 0,
        total_reviews: 0
      })
      .select()
      .single();

    if (error) throw error;

    toast.success('Service créé avec succès !');
    onOpenChange(false);
    navigate('/vendeur', { 
      state: { 
        newServiceId: data.id,
        showServiceModule: true 
      } 
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // Erreur de validation Zod
      const firstError = error.errors[0];
      toast.error(firstError.message);
    } else if (error.code === '23505') {
      toast.error('Vous avez déjà un service de ce type actif');
    } else {
      console.error('Error creating service:', error);
      toast.error('Erreur lors de la création du service');
    }
  } finally {
    setCreating(false);
  }
};
```

**Estimation:** 45 minutes  
**Test:** Essayer de créer un service avec nom trop court, trop long, caractères spéciaux

---

#### 1.3 Constraint unique pour éviter doublons
**Problème:** Un vendeur peut créer plusieurs services actifs du même type

**Impact:**
- Confusion dans le dashboard
- Données incohérentes
- Problèmes de facturation

**Solution:**
```sql
-- Fichier: supabase/migrations/YYYYMMDD_unique_service_constraint.sql

-- 1. Supprimer les doublons existants (garder le plus récent)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, service_type_id, status
      ORDER BY created_at DESC
    ) as rn
  FROM professional_services
  WHERE status = 'active'
)
UPDATE professional_services
SET status = 'inactive'
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Ajouter la contrainte unique partielle
-- (Uniquement pour les services actifs)
ALTER TABLE professional_services
ADD CONSTRAINT unique_active_user_service_type
EXCLUDE USING gist (
  user_id WITH =,
  service_type_id WITH =
) WHERE (status = 'active');

-- Ou version PostgreSQL < 12:
CREATE UNIQUE INDEX unique_active_service_per_user
ON professional_services (user_id, service_type_id)
WHERE status = 'active';
```

**Estimation:** 20 minutes  
**Test:** Essayer de créer 2 services restaurant actifs → Doit échouer

---

### 🟡 PRIORITÉ 2 - IMPORTANTE (Cette semaine)

#### 2.1 Banner de statut dans le dashboard
**Objectif:** Informer le vendeur du statut de son service

**Solution:**
```typescript
// Fichier: src/components/vendor/business-module/VendorBusinessDashboard.tsx

// Ajouter après les imports
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

// Dans le component, après le header, ajouter:
export function VendorBusinessDashboard({...props}) {
  // ... code existant
  
  return (
    <div className="space-y-6">
      {/* Header existant */}
      <div className="flex items-start justify-between">
        {/* ... */}
      </div>

      {/* ✅ NOUVEAU: Status Banner */}
      {professionalService?.status === 'pending' && (
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
          <Clock className="w-4 h-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">
            Service en cours de validation
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Votre service professionnel est en attente de validation par notre équipe.
            Vous pourrez commencer à vendre une fois validé.
          </AlertDescription>
        </Alert>
      )}

      {professionalService?.verification_status === 'rejected' && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertTitle>Service rejeté</AlertTitle>
          <AlertDescription>
            Votre service n'a pas été approuvé. Contactez le support pour plus d'informations.
          </AlertDescription>
        </Alert>
      )}

      {!professionalService && (
        <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Créez votre premier service professionnel
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Configurez votre activité pour débloquer toutes les fonctionnalités du module métier.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1 text-blue-600"
              onClick={() => setShowAddService(true)}
            >
              Créer maintenant →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards existants */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* ... */}
      </div>
    </div>
  );
}
```

**Props à ajouter:**
```typescript
interface VendorBusinessDashboardProps {
  businessName: string;
  serviceId: string;
  serviceTypeName?: string;
  onRefresh?: () => void;
  professionalService?: VendorProfessionalService | null; // ✅ NOUVEAU
}
```

**Estimation:** 30 minutes  
**Test:** Créer service avec status 'pending' → Voir le banner

---

#### 2.2 Message d'onboarding pour nouveaux vendeurs
**Objectif:** Guider les vendeurs sans produits/commandes

**Solution:**
```typescript
// Fichier: src/components/vendor/business-module/VendorBusinessDashboard.tsx

// Après les KPIs, avant les Tabs
{stats?.products.total === 0 && stats?.orders.total === 0 && (
  <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">
            Bienvenue dans votre espace professionnel !
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Commencez à vendre en quelques étapes simples
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="gap-2 justify-start"
              onClick={() => navigate('/vendeur/products/new')}
            >
              <Plus className="w-4 h-4" />
              Ajouter un produit
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 justify-start"
              onClick={() => navigate('/vendeur/settings')}
            >
              <Settings className="w-4 h-4" />
              Configurer mon profil
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 justify-start"
              onClick={() => window.open('/help/vendor-guide', '_blank')}
            >
              <BookOpen className="w-4 h-4" />
              Guide du vendeur
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

**Estimation:** 20 minutes  
**Test:** Nouveau compte vendeur → Voir le message d'onboarding

---

#### 2.3 Améliorer le retry dans Auth.tsx
**Problème:** Race condition lors de la création du professional_service

**Solution:**
```typescript
// Fichier: src/pages/Auth.tsx

// Dans la section création professional_service (ligne ~900)
if (selectedServiceType && selectedServiceType !== 'general') {
  console.log('🔧 Création du professional_service pour le module métier:', selectedServiceType);
  
  // ✅ AMÉLIORATION: Attendre que le vendor soit bien créé
  let vendorCreated = false;
  let retries = 0;
  const maxRetries = 5;
  
  while (!vendorCreated && retries < maxRetries) {
    const { data: vendorCheck } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', authData.user.id)
      .maybeSingle();
    
    if (vendorCheck) {
      vendorCreated = true;
      console.log('✅ Vendor créé, création du professional_service...');
    } else {
      retries++;
      console.log(`⏳ Attente vendor (${retries}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  if (!vendorCreated) {
    console.error('❌ Vendor non créé après', maxRetries, 'tentatives');
    // Continue quand même, le vendeur pourra créer manuellement
  } else {
    // Créer le professional_service
    const { data: serviceType, error: serviceTypeError } = await supabase
      .from('service_types')
      .select('id')
      .eq('code', selectedServiceType)
      .maybeSingle();
    
    if (serviceTypeError) {
      console.error('❌ Erreur récupération service_type:', serviceTypeError);
    } else if (serviceType) {
      const { error: professionalServiceError } = await supabase
        .from('professional_services')
        .insert({
          user_id: authData.user.id,
          service_type_id: serviceType.id,
          business_name: businessName,
          address: validatedData.city,
          phone: `${phoneCode} ${formData.phone}`,
          email: validatedData.email,
          status: 'active', // ✅ CHANGÉ: Actif directement (plus 'pending')
          verification_status: 'unverified'
        });
      
      if (professionalServiceError) {
        console.error('❌ Erreur création professional_service:', professionalServiceError);
      } else {
        console.log('✅ Professional service créé - Module métier activé:', selectedServiceType);
      }
    } else {
      console.warn('⚠️ Service type non trouvé pour le code:', selectedServiceType);
    }
  }
}
```

**Estimation:** 20 minutes  
**Test:** Inscription vendeur → Vérifier que professional_service est créé

---

### 🟢 PRIORITÉ 3 - AMÉLIORATIONS (Ce mois-ci)

#### 3.1 Upload d'images (logo, cover)
**Objectif:** Permettre aux vendeurs de personnaliser leur service

**Étapes:**
1. Migration pour ajouter les colonnes
2. Composant ImageUpload réutilisable
3. Intégration dans AddServiceModal et page d'édition

**Estimation:** 2-3 heures

---

#### 3.2 Page de gestion des services
**Route:** `/vendeur/services`

**Features:**
- Liste de tous les professional_services du vendeur
- Filtres par statut (actif, pending, suspendu)
- Actions: Modifier, Désactiver, Supprimer
- Statistiques par service

**Estimation:** 4-5 heures

---

#### 3.3 Interface admin de validation
**Route:** `/pdg/services/validation`

**Features:**
- Liste des services en attente
- Détails du service + infos vendeur
- Actions: Approuver, Rejeter (avec raison)
- Notifications automatiques au vendeur

**Estimation:** 3-4 heures

---

#### 3.4 Horaires d'ouverture
**Tables:**
```sql
CREATE TABLE service_hours (...)
```

**UI:**
- Dans settings du service
- Sélecteur de jours + horaires
- Affichage sur la page publique du service

**Estimation:** 3-4 heures

---

## 🧪 PLAN DE TESTS

### Tests manuels prioritaires

1. **Test d'inscription vendeur**
   ```
   1. S'inscrire comme vendeur avec service_type = "restaurant"
   2. Vérifier que vendors est créé
   3. Vérifier que professional_services est créé
   4. Vérifier que vendor.service_type = "restaurant"
   5. Se connecter et naviguer vers /vendeur
   6. Cliquer sur "Module Métier"
   7. Vérifier que VendorBusinessDashboard s'affiche
   ```

2. **Test de création de service**
   ```
   1. Se connecter comme vendeur existant
   2. Naviguer vers Module Métier
   3. Cliquer "Nouveau service"
   4. Sélectionner un type (ex: Beauté)
   5. Remplir le formulaire
   6. Valider
   7. Vérifier la redirection
   8. Vérifier que le nouveau service apparaît
   ```

3. **Test de validation**
   ```
   1. Dans AddServiceModal, essayer:
      - Nom trop court (< 3 chars) → Erreur
      - Nom trop long (> 100 chars) → Erreur
      - Caractères spéciaux (@#$) → Erreur
      - Nom valide → Succès
   ```

4. **Test de synchronisation**
   ```
   1. Créer un professional_service
   2. Vérifier dans vendors que service_type est mis à jour
   3. Modifier le service_type_id
   4. Vérifier que vendors.service_type change
   ```

---

## 📅 TIMELINE SUGGÉRÉ

### Semaine 1 (Priorité 1)
- [ ] Lundi: Trigger de synchronisation (1.1)
- [ ] Mardi: Validation renforcée (1.2)
- [ ] Mercredi: Constraint unique (1.3)
- [ ] Jeudi: Tests et corrections
- [ ] Vendredi: Déploiement + monitoring

### Semaine 2 (Priorité 2)
- [ ] Lundi: Banner de statut (2.1)
- [ ] Mardi: Message d'onboarding (2.2)
- [ ] Mercredi: Retry amélioré (2.3)
- [ ] Jeudi: Tests E2E complets
- [ ] Vendredi: Documentation

### Semaine 3-4 (Priorité 3)
- [ ] Upload d'images (3.1)
- [ ] Page de gestion services (3.2)
- [ ] Interface admin validation (3.3)
- [ ] Horaires d'ouverture (3.4)

---

## ✅ CHECKLIST DE VALIDATION

Avant de considérer le système "parfait":

- [ ] Aucune erreur dans la console lors de l'inscription
- [ ] professional_services créé automatiquement à 100%
- [ ] Synchronisation vendor ↔ professional_services fonctionne
- [ ] Impossible de créer 2 services actifs du même type
- [ ] Validation formulaire robuste (tous les cas testés)
- [ ] Messages d'erreur clairs et en français
- [ ] Dashboard s'affiche même sans données
- [ ] Banners de statut affichés correctement
- [ ] Onboarding guide visible pour nouveaux vendeurs
- [ ] Performance acceptable (< 1s chargement dashboard)
- [ ] Responsive sur mobile (testéiPhone et Android)
- [ ] Tests E2E passent à 100%
- [ ] Documentation à jour
- [ ] Migrations SQL documentées

---

## 🚨 ROLLBACK PLAN

En cas de problème après déploiement:

1. **Trigger de synchronisation casse tout**
   ```sql
   DROP TRIGGER IF EXISTS sync_vendor_service_after_insert ON professional_services;
   DROP TRIGGER IF EXISTS sync_vendor_service_after_update ON professional_services;
   DROP FUNCTION IF EXISTS sync_vendor_service_type();
   ```

2. **Constraint unique bloque création**
   ```sql
   DROP INDEX IF EXISTS unique_active_service_per_user;
   -- Ou
   ALTER TABLE professional_services DROP CONSTRAINT unique_active_user_service_type;
   ```

3. **Validation trop stricte**
   ```typescript
   // Commenter la validation Zod dans handleCreate
   // const validatedData = serviceFormSchema.parse(formData);
   // Utiliser directement les valeurs brutes
   ```

---

## 📊 MÉTRIQUES DE SUCCÈS

Pour mesurer le succès de l'implémentation:

1. **Taux de réussite d'inscription vendeur**
   - Avant: ~85% (erreurs professional_services)
   - Cible: >98%

2. **Temps moyen de création de service**
   - Cible: < 30 secondes

3. **Erreurs en production**
   - Cible: < 1% des opérations

4. **Satisfaction utilisateur**
   - Sondage après création de service
   - Cible: >4/5 étoiles

---

## 🔗 FICHIERS À MODIFIER

Récapitulatif des fichiers à toucher:

```
À créer:
- supabase/migrations/YYYYMMDD_sync_vendor_professional_services.sql
- supabase/migrations/YYYYMMDD_unique_service_constraint.sql

À modifier:
- src/components/vendor/business-module/AddServiceModal.tsx
- src/components/vendor/business-module/VendorBusinessDashboard.tsx
- src/pages/Auth.tsx

À tester:
- Tests E2E: tests/e2e/vendor-module.spec.ts (à créer)
- Tests unitaires: tests/unit/AddServiceModal.test.tsx (à créer)
```

---

**Date:** Janvier 2026  
**Auteur:** Équipe 224Solutions  
**Version:** 1.0  
**Statut:** 📋 Prêt pour implémentation
