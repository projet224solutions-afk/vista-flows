/**
 * GUIDE DÉPLOIEMENT: Système de Certification Vendeur
 * VERSION 2.0 - Avec validation KYC
 * 224SOLUTIONS
 */

# 🎯 Système de Certification Vendeur v2.0

## ⚠️ IMPORTANTE: Version 2.0
**Migration majeure**: La certification nécessite désormais un KYC validé.
- Voir `VENDOR_CERTIFICATION_V2_MIGRATION.md` pour les détails de migration
- Statut `EN_ATTENTE` supprimé
- Vendeurs ne peuvent plus demander certification
- Validation KYC automatique (trigger + edge function)

---

## ✅ Fichiers créés

### 1. Base de données
- `supabase/migrations/20260104_vendor_certifications.sql`
  - Table `vendor_certifications`
  - Enum `vendor_certification_status` (3 statuts: NON_CERTIFIE, CERTIFIE, SUSPENDU)
  - **Champs KYC**: `kyc_verified_at`, `kyc_status`
  - **Trigger**: `check_vendor_kyc_before_certification()` (validation auto)
  - RLS policies (CEO/SUPER_ADMIN uniquement, vendeurs lecture seule)
  - Triggers auto-création pour nouveaux vendeurs
  - Vue `certified_vendors` pour affichage public

### 2. Edge Function
- `supabase/functions/verify-vendor/index.ts`
  - Sécurisée: CEO/SUPER_ADMIN uniquement
  - Actions: CERTIFY, SUSPEND, REJECT, REQUEST_INFO
  - **Vérification KYC**: Double check (vendor_kyc + vendors.kyc_status)
  - Bloque certification si KYC non validé (status != 'verified')
  - Validation stricte des permissions

### 3. Types TypeScript
- `src/types/vendorCertification.ts`
  - Types complets pour certifications (sans EN_ATTENTE)
  - Helpers pour labels et couleurs
  - Interface avec champs KYC

### 4. Composants React
- `src/components/vendor/CertifiedVendorBadge.tsx`
  - Badge visuel avec 3 variantes (default, compact, detailed)
  - Icons et tooltips
  - Support Tailwind CSS
  - **v2.0**: Retiré badge "En attente" jaune
  
- `src/components/ceo/VendorCertificationManager.tsx`
  - Interface PDG complète
  - Stats dashboard (sans stats "En attente")
  - Filtres et recherche
  - Gestion individuelle des certifications
  - Dialog de confirmation
  - **v2.0**: Affichage statut KYC

### 5. Hooks
- `src/hooks/useVendorCertification.ts`
  - Hook pour récupérer certification d'un vendeur
  - Real-time subscriptions
  - **v2.0**: Hook `useRequestCertification` SUPPRIMÉ (plus de demande vendeur)

---

## 🚀 Déploiement

### Étape 1: Appliquer la migration SQL

```powershell
# Se connecter à Supabase
supabase db push

# Ou appliquer manuellement dans SQL Editor de Supabase Dashboard
```

### Étape 2: Déployer l'Edge Function

```powershell
# Déployer verify-vendor
supabase functions deploy verify-vendor

# Vérifier les logs
supabase functions logs verify-vendor --tail
```

### Étape 3: Tester l'Edge Function

```powershell
# Test avec curl
curl -X POST https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/verify-vendor \
  -H "Authorization: Bearer YOUR_CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "VENDOR_UUID",
    "action": "CERTIFY",
    "internal_notes": "Vendeur vérifié - documents OK"
  }'
```

---

## 📍 Intégration dans l'interface PDG

### Ajouter la route dans CEODashboard

**`src/pages/CEODashboard.tsx`**
```tsx
import { VendorCertificationManager } from '@/components/ceo/VendorCertificationManager';

// Dans le routing
<Route path="vendor-certifications" element={<VendorCertificationManager />} />
```

### Ajouter le menu dans la sidebar PDG

```tsx
{
  title: 'Certifications Vendeurs',
  icon: Shield,
  path: 'vendor-certifications'
}
```

---

## 🎨 Intégration des badges

### 1. Profil vendeur

**`src/components/vendor/VendorProfile.tsx`**
```tsx
import { CertifiedVendorBadge } from '@/components/vendor/CertifiedVendorBadge';
import { useVendorCertification } from '@/hooks/useVendorCertification';

function VendorProfile({ vendorId }) {
  const { certification, isCertified } = useVendorCertification(vendorId);

  return (
    <div className="flex items-center gap-2">
      <h1>{vendorName}</h1>
      {certification && (
        <CertifiedVendorBadge 
          status={certification.status}
          verifiedAt={certification.verified_at}
        />
      )}
    </div>
  );
}
```

### 2. Carte produit

**`src/components/products/ProductCard.tsx`**
```tsx
import { CertifiedIcon } from '@/components/vendor/CertifiedVendorBadge';
import { useVendorCertification } from '@/hooks/useVendorCertification';

function ProductCard({ product }) {
  const { certification } = useVendorCertification(product.vendor_id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span>{product.vendor_name}</span>
          <CertifiedIcon status={certification?.status} className="w-4 h-4" />
        </div>
      </CardHeader>
      {/* ... */}
    </Card>
  );
}
```

### 3. Page boutique

**`src/pages/VendorStorefront.tsx`**
```tsx
import { CertificationShield } from '@/components/vendor/CertifiedVendorBadge';

function VendorStorefront({ vendor }) {
  const { certification } = useVendorCertification(vendor.id);

  return (
    <div className="flex items-center gap-4">
      <img src={vendor.avatar} className="w-20 h-20 rounded-full" />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {vendor.name}
          <CertificationShield status={certification?.status} size="md" />
        </h1>
      </div>
    </div>
  );
}
```

---

## 🔐 Sécurité

### RLS Policies actives
- ✅ Public peut voir uniquement vendeurs CERTIFIES
- ✅ Vendeurs peuvent voir leur propre certification
- ✅ CEO/SUPER_ADMIN peuvent tout voir et modifier
- ✅ Vendeurs peuvent demander certification (INSERT EN_ATTENTE)
- ✅ Impossible pour vendeur de se certifier lui-même

### Validation Edge Function
- ✅ Vérification token JWT
- ✅ Vérification rôle CEO/SUPER_ADMIN
- ✅ Validation vendor_id existe
- ✅ Validation vendor_id est bien un VENDOR
- ✅ Logs d'audit complets

---

## 📊 Extension future: Payment Score

La table est prête pour le scoring paiement :

```sql
-- Colonnes déjà présentes
payment_score INTEGER (0-100)
successful_transactions INTEGER
failed_transactions INTEGER
total_revenue DECIMAL(10,2)
```

### Utilisation future

```sql
-- Fonction de calcul
SELECT calculate_payment_score('vendor_uuid');

-- Mise à jour auto après transaction
CREATE TRIGGER update_vendor_payment_score
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_score();
```

---

## 🧪 Tests

### Test 1: Créer certification
```typescript
const { data } = await supabase.functions.invoke('verify-vendor', {
  body: {
    vendor_id: 'test-vendor-id',
    action: 'CERTIFY',
    internal_notes: 'Test certification'
  }
});
```

### Test 2: Vérifier badge affiché
```typescript
const { certification } = useVendorCertification('vendor-id');
console.log('Is certified:', certification?.status === 'CERTIFIE');
```

### Test 3: Vérifier RLS
```sql
-- En tant que vendeur, essayer de modifier autre vendeur (doit échouer)
UPDATE vendor_certifications 
SET status = 'CERTIFIE' 
WHERE vendor_id = 'other-vendor-id';
-- ERROR: new row violates row-level security policy
```

---

## 📝 TODO Next Steps

1. **Intégrer dans interface PDG** ✅
   - Route `/ceo/vendor-certifications`
   - Menu sidebar

2. **Ajouter badges visuels** (à faire)
   - Profil vendeur
   - Cartes produits
   - Page boutique
   - Résultats recherche

3. **Notifications** (futur)
   - Email au vendeur quand certifié
   - Email au vendeur si rejet
   - Push notification

4. **Analytics** (futur)
   - Taux de certification
   - Temps moyen de vérification
   - Impact sur conversions

5. **Payment Score** (futur)
   - Intégrer avec wallet transactions
   - Calcul automatique après chaque paiement
   - Affichage score dans profil vendeur

---

## 🎯 Résultat attendu

✅ Table `vendor_certifications` créée avec RLS strict  
✅ Edge Function `verify-vendor` sécurisée (CEO/SUPER_ADMIN uniquement)  
✅ Badge "Vendeur certifié ✅" prêt à afficher  
✅ Interface PDG pour gérer certifications  
✅ Hooks React pour intégration facile  
✅ Types TypeScript complets  
✅ Extension future Payment Score préparée  
✅ Aucun vendeur ne peut se certifier lui-même  
✅ Certification persistante et auditable  

---

## 🆘 Support

En cas de problème :
1. Vérifier les logs Edge Function: `supabase functions logs verify-vendor`
2. Vérifier RLS policies: SQL Editor > Policies
3. Tester avec curl (voir section Test)
4. Vérifier role user: `SELECT role FROM profiles WHERE id = 'user-id'`

---

**Système prêt pour production ! 🚀**
