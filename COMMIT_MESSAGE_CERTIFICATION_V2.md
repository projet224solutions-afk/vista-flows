# COMMIT: Certification Vendeur v2.0 - Intégration KYC

## Type
`feat` - Fonctionnalité majeure (migration système)

## Scope
`vendor-certification` - Système certification vendeurs

## Message court
```
feat(vendor-certification): migrate to v2.0 with mandatory KYC validation
```

## Message complet
```
feat(vendor-certification): migrate to v2.0 with mandatory KYC validation

BREAKING CHANGE: Remove EN_ATTENTE status and vendor self-request workflow

Migration v1.0 → v2.0 to integrate existing KYC system:
- Remove EN_ATTENTE status from certification enum (4→3 statuses)
- Add KYC validation trigger at database level
- Add KYC verification in edge function (dual check: vendor_kyc + vendors.kyc_status)
- Remove vendor self-request capability (RLS policy updated)
- Add kyc_verified_at and kyc_status fields for traceability
- Remove requested_at field (no more vendor requests)

Database Changes:
- Modified: vendor_certification_status enum (removed EN_ATTENTE)
- Added: check_vendor_kyc_before_certification() trigger function
- Added: kyc_verified_at TIMESTAMPTZ column
- Added: kyc_status TEXT column
- Removed: requested_at TIMESTAMPTZ column
- Modified: RLS policy (vendors cannot UPDATE anymore)

Backend Changes:
- supabase/functions/verify-vendor/index.ts: Add KYC validation before CERTIFY action
- Returns 400 error if KYC not verified (status != 'verified')
- REQUEST_INFO now sets NON_CERTIFIE with [INFO REQUESTED] note

Frontend Changes:
- src/types/vendorCertification.ts: Remove EN_ATTENTE from type union
- src/components/vendor/CertifiedVendorBadge.tsx: Remove yellow badge, Clock icon
- src/components/ceo/VendorCertificationManager.tsx: Remove pending stats, EN_ATTENTE filter
- src/hooks/useVendorCertification.ts: Remove useRequestCertification() hook entirely

Workflow Changes:
- Vendors can NO LONGER request certification themselves
- Only CEO/SUPER_ADMIN can certify (via PDG interface)
- KYC validation is MANDATORY before certification (checked at 2 levels)
- Trigger blocks INSERT/UPDATE if KYC not verified
- Edge function returns error if KYC not verified

KYC Verification:
- Primary: vendor_kyc.status = 'verified'
- Fallback: vendors.kyc_status = 'verified'
- Both checks ensure backward compatibility

Documentation:
- Added: VENDOR_CERTIFICATION_V2_MIGRATION.md (complete migration guide)
- Added: VENDOR_CERTIFICATION_V2_SUMMARY.md (quick reference)
- Updated: VENDOR_CERTIFICATION_DEPLOYMENT_GUIDE.md (v2.0 section)

Refs: #certification #kyc #vendor #v2
```

## Fichiers modifiés

### Backend (2)
- `supabase/migrations/20260104_vendor_certifications.sql`
- `supabase/functions/verify-vendor/index.ts`

### Frontend (4)
- `src/types/vendorCertification.ts`
- `src/components/vendor/CertifiedVendorBadge.tsx`
- `src/components/ceo/VendorCertificationManager.tsx`
- `src/hooks/useVendorCertification.ts`

### Documentation (3)
- `VENDOR_CERTIFICATION_V2_MIGRATION.md` (nouveau)
- `VENDOR_CERTIFICATION_V2_SUMMARY.md` (nouveau)
- `VENDOR_CERTIFICATION_DEPLOYMENT_GUIDE.md` (mis à jour)

## Tests recommandés avant commit

```bash
# 1. Vérifier compilation TypeScript
npm run type-check

# 2. Tester migration SQL (local)
supabase db reset
supabase db push

# 3. Tester edge function
supabase functions deploy verify-vendor

# 4. Test KYC validation
# - Essayer de certifier vendeur sans KYC
# - Vérifier erreur 400 "KYC non vérifié"

# 5. Test interface PDG
# - Vérifier qu'il n'y a plus de statut "En attente"
# - Vérifier que les stats ont 4 colonnes (pas 5)
```

## Commandes Git

```bash
# 1. Vérifier les fichiers modifiés
git status

# 2. Ajouter tous les fichiers
git add .

# 3. Commit avec message complet
git commit -F COMMIT_MESSAGE_CERTIFICATION_V2.md

# Ou commit court:
git commit -m "feat(vendor-certification): migrate to v2.0 with mandatory KYC validation

BREAKING CHANGE: Remove EN_ATTENTE status and vendor self-request workflow

- Remove EN_ATTENTE from certification enum (4→3 statuses)
- Add KYC validation trigger at database level
- Add KYC verification in edge function (dual check)
- Remove vendor self-request capability (RLS updated)
- Add kyc_verified_at and kyc_status fields
- Remove useRequestCertification() hook entirely

Refs: #certification #kyc #vendor #v2"

# 4. Push vers GitHub
git push origin main
```

## Breaking Changes

⚠️ **ATTENTION**: Cette mise à jour contient des changements BREAKING:

1. **Type VendorCertificationStatus**: 
   - Removed `'EN_ATTENTE'` from union type
   - Components using this type must handle only 3 statuses

2. **Hook useRequestCertification**:
   - Completely REMOVED from `src/hooks/useVendorCertification.ts`
   - Any component importing this hook will break

3. **Database enum**:
   - `EN_ATTENTE` no longer exists in vendor_certification_status
   - Existing records with EN_ATTENTE will fail to load

4. **Vendor permissions**:
   - RLS policy blocks vendors from UPDATE
   - Vendors cannot modify their certification status anymore

## Migration des données existantes (si nécessaire)

Si des vendeurs ont déjà le statut `EN_ATTENTE` en production:

```sql
-- Option 1: Convertir EN_ATTENTE → NON_CERTIFIE
UPDATE vendor_certifications
SET status = 'NON_CERTIFIE'
WHERE status = 'EN_ATTENTE';

-- Option 2: Supprimer les certifications EN_ATTENTE
DELETE FROM vendor_certifications
WHERE status = 'EN_ATTENTE';
```

⚠️ Exécuter AVANT d'appliquer la migration qui supprime EN_ATTENTE de l'enum.

---

**224SOLUTIONS** - Certification Vendeur v2.0
*Ready to commit: 2025-01-04*
