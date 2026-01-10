# 🧪 TEST SHORT URL REDIRECT

## Problème Identifié
**Symptôme:** La page s'actualise automatiquement au lieu de rediriger vers la boutique

## Causes Identifiées et Corrigées

### ❌ Problème 1: Boucle Infinie useEffect
**Cause:** `navigate` dans les dépendances de useEffect causait un re-render infini
**Solution:** ✅ Retiré `navigate` des dépendances (stable function)

### ❌ Problème 2: Redirections Multiples
**Cause:** useEffect pouvait se déclencher plusieurs fois
**Solution:** ✅ Ajout de `useRef(hasRedirected)` pour garantir une seule redirection

### ❌ Problème 3: Navigation avec Historique
**Cause:** `navigate()` sans `replace: true` ajoutait à l'historique
**Solution:** ✅ Utilisation de `navigate(path, { replace: true })`

### ❌ Problème 4: State Management
**Cause:** Pas de state pour suivre la redirection
**Solution:** ✅ Ajout de `useState(isRedirecting)` pour éviter double appel

## Code Corrigé

```typescript
// Nouvelles protections ajoutées:
const [isRedirecting, setIsRedirecting] = useState(false);
const hasRedirected = useRef(false);

useEffect(() => {
  // 🛡️ Empêcher les redirections multiples
  if (hasRedirected.current || isRedirecting) {
    return;
  }

  const handleRedirect = async () => {
    setIsRedirecting(true);
    hasRedirected.current = true;
    
    // ... résolution du short link ...
    
    // ✅ Utiliser replace pour éviter l'historique
    navigate(targetPath, { replace: true });
  };

  handleRedirect();
}, [shortCode]); // ✅ Seulement shortCode, pas navigate
```

## Test Manuel

### Étape 1: Créer un Short Link
```sql
-- Dans Supabase SQL Editor
INSERT INTO shared_links (short_code, original_url, title, link_type, resource_id)
VALUES (
  'TEST123',
  'https://224solution.net/boutique/test-boutique',
  'Test Boutique',
  'shop',
  '550e8400-e29b-41d4-a716-446655440000'
);
```

### Étape 2: Tester la Redirection
1. Ouvrir: `https://votredomaine.com/s/TEST123`
2. **Attendu:** Redirection immédiate vers `/boutique/test-boutique`
3. **Vérifier:** Pas de rechargement en boucle
4. **Console:** Doit afficher:
   ```
   [ShortUrlRedirect] Resolving short code: TEST123
   [ShortUrlRedirect] Resolved to: https://224solution.net/boutique/test-boutique
   [ShortUrlRedirect] Redirecting to: /boutique/test-boutique
   ```

### Étape 3: Tester Short Link Invalide
1. Ouvrir: `https://votredomaine.com/s/INVALID`
2. **Attendu:** Message "Ce lien n'existe pas ou a expiré"
3. **Attendu:** Redirection vers `/marketplace`
4. **Vérifier:** Pas de boucle

## Vérifications Supabase

### 1. Vérifier que la table existe
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'shared_links'
);
```

### 2. Vérifier les données
```sql
SELECT 
  short_code,
  original_url,
  title,
  link_type,
  views_count,
  created_at
FROM shared_links
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Créer un lien de test
```sql
INSERT INTO shared_links (
  short_code,
  original_url,
  title,
  link_type,
  views_count,
  is_active
) VALUES (
  'BOUTIQUE1',
  '/boutique/ma-super-boutique',
  'Ma Super Boutique',
  'shop',
  0,
  true
) ON CONFLICT (short_code) DO NOTHING;
```

## Debugging en Live

### Dans la Console Browser
```javascript
// Ouvrir /s/BOUTIQUE1
// Observer les logs:

// ✅ Bon comportement:
// [ShortUrlRedirect] Resolving short code: BOUTIQUE1
// [ShortUrlRedirect] Resolved to: /boutique/ma-super-boutique
// [ShortUrlRedirect] Redirecting to: /boutique/ma-super-boutique
// → Redirection immédiate vers la boutique

// ❌ Mauvais comportement (avant correction):
// [ShortUrlRedirect] Resolving short code: BOUTIQUE1
// [ShortUrlRedirect] Resolving short code: BOUTIQUE1
// [ShortUrlRedirect] Resolving short code: BOUTIQUE1
// → Boucle infinie (page se recharge)
```

## Si le Problème Persiste

### Solution Alternative: Window.location
Si `navigate()` cause toujours des problèmes, utiliser:

```typescript
// Au lieu de:
navigate(targetPath, { replace: true });

// Utiliser:
window.location.replace(targetPath);
```

### Vérifier les RLS Policies
```sql
-- Vérifier que les policies permettent la lecture
SELECT * FROM shared_links WHERE short_code = 'TEST123';

-- Si erreur de permission, exécuter:
DROP POLICY IF EXISTS "Anyone can read active shared links" ON shared_links;
CREATE POLICY "Anyone can read active shared links"
ON shared_links FOR SELECT
USING (is_active = true);
```

## Checklist de Déploiement

- [ ] Migration `20251227033606_df87d1ca-d8b2-45b2-b95a-810777c8988e.sql` exécutée
- [ ] Table `shared_links` créée
- [ ] RLS policies activées
- [ ] Route `/s/:shortCode` dans App.tsx
- [ ] Composant ShortUrlRedirect corrigé (protections anti-boucle)
- [ ] Test avec un short code valide
- [ ] Test avec un short code invalide
- [ ] Vérification console (pas de logs en boucle)

## Résultat Attendu

✅ **Clic sur short URL** → Redirection immédiate vers la boutique  
✅ **Pas de rechargement** → Navigation instantanée  
✅ **Historique propre** → `replace: true` évite entrée historique  
✅ **Tracking fonctionnel** → `views_count` incrémenté automatiquement

---

**Date:** 9 janvier 2026  
**Status:** ✅ Corrections appliquées - Prêt pour test
